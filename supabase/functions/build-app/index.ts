// EgreedAI App Builder — prompt → real project.
// Every stage uses the same selected configured provider, without fallback.
// Returns a complete file tree the client can browse, edit and download.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AsyncLocalStorage } from "node:async_hooks";
import { extractJson } from "../_shared/nvidia.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadGeminiKeys } from "../_shared/geminiKeys.ts";
import { ProviderError, requestReply, selectProvider, type Provider } from "../_shared/provider.ts";
import { QUALITY_REQUIREMENTS } from "../_shared/playbooks.ts";
import { REACT_STACK_EXPERT } from "../_shared/reactStack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProjectFile { path: string; content: string; language?: string }

const ARCHITECT = `You are EgreedAI Architect — a senior full-stack engineer at Egreed Technology LTD.
You turn a product request into a real, runnable project: files, database schema, API routes and tests.

RULES:
${QUALITY_REQUIREMENTS.map((q) => `- ${q}`).join("\n")}
- Every file must be COMPLETE and runnable. No "...", no "// rest of code", no placeholders.
- Prefer a simple, maintainable architecture over cleverness.
- Validate all input server-side. Never trust client data. Never hardcode secrets — read them from environment variables.
- Use the stack the user asked for. If they did not say, use TypeScript + React (Vite) on the front end, Node.js + Express on the API, and PostgreSQL for data.
- Front-end design must feel like a modern 2026 product: one consistent visual direction, a design-token theme (CSS variables for colours, radius, shadows), Tailwind CSS, responsive mobile-first layouts, app shell with sidebar/topbar for dashboards, cards with soft shadows and 16px+ radius, loading skeletons, empty states, toast feedback, accessible labels and keyboard focus styles, and smooth subtle transitions.

${REACT_STACK_EXPERT}`;

// One bounded provider request per stage, with concurrent requests isolated.
interface RequestContext { provider: Provider; key: string; signal: AbortSignal }
const reqStore = new AsyncLocalStorage<RequestContext>();
async function llm(_kind: string, messages: { role: string; content: string }[], _key: string, opts: { maxTokens?: number }) {
  const context = reqStore.getStore();
  if (!context) throw new ProviderError(503, "The configured connection is unavailable.");
  const text = await requestReply(context.provider, context.key, messages, context.signal, fetch, Math.max(16384, opts.maxTokens || 0));
  return { text };
}
const codeLlm = llm.bind(null, "code");

/** Accept the plan shapes models actually return (wrapped, string file lists, alt keys). */
function normalizePlan(raw: any): any | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw.plan && typeof raw.plan === "object" ? raw.plan : raw.project && typeof raw.project === "object" ? raw.project : raw;
  let files = p.files ?? p.file_tree ?? p.fileTree ?? p.structure;
  if (files && !Array.isArray(files) && typeof files === "object") files = Object.entries(files).map(([path, purpose]) => ({ path, purpose: String(purpose ?? "") }));
  if (!Array.isArray(files)) return null;
  files = files.map((f: any) => typeof f === "string" ? { path: f.trim(), purpose: "" } : { path: String(f?.path ?? f?.name ?? f?.file ?? "").trim(), purpose: String(f?.purpose ?? f?.description ?? "") })
    .filter((f: any) => f.path && !f.path.endsWith("/"));
  if (!files.length) return null;
  return { ...p, name: String(p.name ?? "egreed-app"), summary: String(p.summary ?? p.description ?? ""), files };
}

function sysWith(extra: string) { return `${ARCHITECT}\n\n${extra}`; }

async function planProject(prompt: string, stack: string, key: string) {
  const msgs = [
    { role: "system", content: sysWith(`Plan the project. Reply with JSON only, no prose:
{"name":"kebab-case-name","summary":"one sentence","stack":["..."],"steps":["ordered build steps"],"entities":[{"name":"table_name","fields":["id uuid pk","..."],"notes":"..."}],"endpoints":[{"method":"GET","path":"/api/...","purpose":"...","auth":"public|user|admin"}],"files":[{"path":"relative/path.ext","purpose":"what it contains"}]}
Keep it to at most 14 files. Include a README, the API entry point, the data layer, at least one test file, and a package/dependency manifest.`) },
    { role: "user", content: `Build request:\n${prompt}\n\nPreferred stack: ${stack || "your choice"}` },
  ];
  const { text } = await llm("reason", msgs, key, { temperature: 0.2, maxTokens: 4000, json: true });
  const plan = normalizePlan(extractJson<any>(text));
  if (plan) return plan;
  return null;
}

function recoverSingleFile(text: string): string | null {
  const t = (text || "").trim();
  if (!t) return null;
  // Content field from a truncated/mis-escaped JSON object.
  const m = t.match(/"content"\s*:\s*"([\s\S]*)/);
  if (m) {
    let body = m[1].replace(/"\s*}\s*]\s*}\s*(```)?\s*$/, "").replace(/"\s*}\s*$/, "");
    body = body.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    return body.trim() ? body : null;
  }
  const fence = t.match(/```[\w.+-]*\n([\s\S]*?)```/);
  if (fence && fence[1].trim()) return fence[1];
  if (t.startsWith("{") || t.startsWith("[")) return null;
  return t;
}

async function writeFiles(prompt: string, plan: any, key: string, targets: { path: string; purpose: string }[]) {
  const msgs = [
    { role: "system", content: sysWith(`Write the actual file contents. Reply with JSON only:
{"files":[{"path":"...","language":"ts|tsx|js|sql|json|md|py|...","content":"FULL file content"}]}
Escape newlines properly inside JSON strings. Write every requested file completely.`) },
    { role: "user", content: `Build request:\n${prompt}\n\nProject plan:\n${JSON.stringify({ name: plan?.name, stack: plan?.stack, entities: plan?.entities, endpoints: plan?.endpoints }, null, 2)}\n\nWrite exactly these files now:\n${targets.map((f) => `- ${f.path}: ${f.purpose}`).join("\n")}` },
  ];
  const pick = (t: string) => {
    const parsed = extractJson<{ files: ProjectFile[] }>(t);
    return Array.isArray(parsed?.files) ? parsed.files.filter((f) => f?.path && typeof f.content === "string") : [];
  };
  const { text } = await codeLlm(msgs, key, { temperature: 0.15, maxTokens: 6000, json: true });
  const out = pick(text);
  if (out.length) return out;
  // Single-file step: accept raw code (fenced or a broken JSON wrapper) instead of failing on escaping.
  if (targets.length === 1) {
    const raw = recoverSingleFile(text);
    if (raw) return [{ path: targets[0].path, language: targets[0].path.split(".").pop() || "txt", content: raw } as ProjectFile];
  }
  throw new ProviderError(422, "The AI returned an unreadable file. No automatic retry was made.");
}

async function validateProject(files: ProjectFile[], key: string) {
  const listing = files.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n").slice(0, 30000);
  const { text } = await llm("reason", [
    { role: "system", content: `You are the validation stage. Read the project files and report real defects only: syntax errors, imports of files or packages that do not exist in the project or manifest, undefined symbols, mismatched route/handler names, schema/query mismatches, missing input validation, security holes (injection, broken authorization, secret exposure), and incomplete files.
Reply with JSON only: {"ok":true|false,"issues":[{"path":"file","severity":"high|medium|low","problem":"...","fix":"..."}]}` },
    { role: "user", content: listing },
  ], key, { temperature: 0, maxTokens: 2000, json: true });
  const review = extractJson<{ ok: boolean; issues: any[] }>(text);
  if (!review || typeof review.ok !== "boolean" || !Array.isArray(review.issues)) throw new ProviderError(422, "The project review was unreadable. It has not been marked as passing.");
  return review;
}

async function fixFiles(files: ProjectFile[], issues: any[], key: string) {
  const paths = [...new Set(issues.map((i) => i?.path).filter(Boolean))];
  const subset = files.filter((f) => paths.includes(f.path));
  if (!subset.length) return [];
  const { text } = await codeLlm([
    { role: "system", content: sysWith(`Fix the defects. Reply with JSON only: {"files":[{"path":"...","language":"...","content":"FULL corrected file"}]}. Return every file you changed, complete. Change nothing that was not a defect.`) },
    { role: "user", content: `Defects:\n${JSON.stringify(issues, null, 2)}\n\nCurrent files:\n${subset.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n").slice(0, 26000)}` },
  ], key, { temperature: 0.1, maxTokens: 7000, json: true });
  const parsed = extractJson<{ files: ProjectFile[] }>(text);
  return Array.isArray(parsed?.files) ? parsed.files.filter((f) => f?.path && typeof f.content === "string") : [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  const respond = (error: string, status: number) => new Response(JSON.stringify({ error }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) { clearTimeout(timeout); return respond("The AI connection is not configured.", 503); }
  const admin = createClient(url, serviceKey);
  let selected: { provider: Provider; key: string } | undefined;
  try {
    selected = selectProvider(await loadGeminiKeys(controller.signal), Deno.env.get("openai") || Deno.env.get("openai1"));
    const { data: access, error } = await admin.from("chat_provider_access_state").select("denied").eq("provider", selected.provider).maybeSingle();
    if (error) return respond("Could not check the configured connection. No AI request was sent.", 503);
    if (access?.denied) return respond("The configured AI connection is blocked. An admin must restore access. No other provider was used.", 403);
    return await reqStore.run({ ...selected, signal: controller.signal }, () => handle(req));
  } catch (error) {
    if (error instanceof ProviderError && error.denied && selected) {
      await admin.from("chat_provider_access_state").upsert({ provider: selected.provider, denied: true, reason: error.message, updated_at: new Date().toISOString() });
    }
    if (controller.signal.aborted) return respond("This build step took too long. No other provider was used.", 504);
    if (error instanceof ProviderError) return respond(error.message, error.status);
    console.error("[build-app] request failed", error instanceof Error ? error.name : "unknown");
    return respond("The build step could not finish. No other provider was used.", 502);
  } finally { clearTimeout(timeout); }
});

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const key = ""; // Provider credentials stay inside the isolated request context.

  // Staged API: the client runs plan → files (per batch) → validate → fix as
  // separate short requests, so no single call hits the edge timeout.
  const body = await req.json().catch(() => ({}));
  const stage = String(body?.stage ?? "plan");
  const prompt = String(body?.prompt ?? "").trim().slice(0, 6000);
  const stack = String(body?.stack ?? "").slice(0, 200);
  try {
    if (stage === "plan") {
      if (prompt.length < 8) return json({ error: "Describe the app you want in at least a sentence." }, 400);
      const plan = await planProject(prompt, stack, key);
      if (!plan || !Array.isArray(plan.files) || !plan.files.length) return json({ error: "The planner could not shape this request. Try describing it more concretely." }, 422);
      const seen = new Set<string>(); plan.files = plan.files.filter((f: any) => f?.path && !seen.has(f.path) && seen.add(f.path)).slice(0, 14);
      return json({ plan });
    }
    if (stage === "files") {
      const plan = body?.plan;
      const targets = Array.isArray(body?.targets) ? body.targets.slice(0, 5) : [];
      if (!plan || !targets.length) return json({ error: "Missing plan or targets." }, 400);
      return json({ files: await writeFiles(prompt, plan, key, targets) });
    }
    const files: ProjectFile[] = Array.isArray(body?.files)
      ? body.files.filter((f: any) => f?.path && typeof f.content === "string").slice(0, 20) : [];
    if (!files.length) return json({ error: "No files supplied." }, 400);
    if (stage === "validate") return json(await validateProject(files, key));
    if (stage === "fix") {
      const issues = Array.isArray(body?.issues) ? body.issues.slice(0, 30) : [];
      return json({ files: await fixFiles(files, issues, key) });
    }
    return json({ error: `Unknown stage: ${stage}` }, 400);
  } catch (e) {
    throw e;
  }
}
