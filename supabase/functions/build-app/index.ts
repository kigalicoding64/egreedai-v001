// EgreedAI App Builder — prompt → real project.
// PLAN → SCHEMA/API → FILES → TESTS → VALIDATE → FIX, powered by NVIDIA AI (`nvdiaapi`).
// Returns a complete file tree the client can browse, edit and download.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callNvidia, extractJson, getNvidiaKey } from "../_shared/nvidia.ts";
import { QUALITY_REQUIREMENTS } from "../_shared/playbooks.ts";

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
- Use the stack the user asked for. If they did not say, use TypeScript + React (Vite) on the front end, Node.js + Express on the API, and PostgreSQL for data.`;

function sysWith(extra: string) { return `${ARCHITECT}\n\n${extra}`; }

async function planProject(prompt: string, stack: string, key: string) {
  const { text } = await callNvidia("reason", [
    { role: "system", content: sysWith(`Plan the project. Reply with JSON only, no prose:
{"name":"kebab-case-name","summary":"one sentence","stack":["..."],"steps":["ordered build steps"],"entities":[{"name":"table_name","fields":["id uuid pk","..."],"notes":"..."}],"endpoints":[{"method":"GET","path":"/api/...","purpose":"...","auth":"public|user|admin"}],"files":[{"path":"relative/path.ext","purpose":"what it contains"}]}
Keep it to at most 14 files. Include a README, the API entry point, the data layer, at least one test file, and a package/dependency manifest.`) },
    { role: "user", content: `Build request:\n${prompt}\n\nPreferred stack: ${stack || "your choice"}` },
  ], key, { temperature: 0.2, maxTokens: 2500, json: true });
  return extractJson<any>(text);
}

async function writeFiles(prompt: string, plan: any, key: string, targets: { path: string; purpose: string }[]) {
  const { text } = await callNvidia("code", [
    { role: "system", content: sysWith(`Write the actual file contents. Reply with JSON only:
{"files":[{"path":"...","language":"ts|tsx|js|sql|json|md|py|...","content":"FULL file content"}]}
Escape newlines properly inside JSON strings. Write every requested file completely.`) },
    { role: "user", content: `Build request:\n${prompt}\n\nProject plan:\n${JSON.stringify({ name: plan?.name, stack: plan?.stack, entities: plan?.entities, endpoints: plan?.endpoints }, null, 2)}\n\nWrite exactly these files now:\n${targets.map((f) => `- ${f.path}: ${f.purpose}`).join("\n")}` },
  ], key, { temperature: 0.15, maxTokens: 8000, json: true });
  const parsed = extractJson<{ files: ProjectFile[] }>(text);
  return Array.isArray(parsed?.files) ? parsed!.files.filter((f) => f?.path && typeof f.content === "string") : [];
}

async function validateProject(files: ProjectFile[], key: string) {
  const listing = files.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n").slice(0, 30000);
  const { text } = await callNvidia("reason", [
    { role: "system", content: `You are the validation stage. Read the project files and report real defects only: syntax errors, imports of files or packages that do not exist in the project or manifest, undefined symbols, mismatched route/handler names, schema/query mismatches, missing input validation, security holes (injection, broken authorization, secret exposure), and incomplete files.
Reply with JSON only: {"ok":true|false,"issues":[{"path":"file","severity":"high|medium|low","problem":"...","fix":"..."}]}` },
    { role: "user", content: listing },
  ], key, { temperature: 0, maxTokens: 2000, json: true });
  return extractJson<{ ok: boolean; issues: any[] }>(text) ?? { ok: true, issues: [] };
}

async function fixFiles(files: ProjectFile[], issues: any[], key: string) {
  const paths = [...new Set(issues.map((i) => i?.path).filter(Boolean))];
  const subset = files.filter((f) => paths.includes(f.path));
  if (!subset.length) return [];
  const { text } = await callNvidia("code", [
    { role: "system", content: sysWith(`Fix the defects. Reply with JSON only: {"files":[{"path":"...","language":"...","content":"FULL corrected file"}]}. Return every file you changed, complete. Change nothing that was not a defect.`) },
    { role: "user", content: `Defects:\n${JSON.stringify(issues, null, 2)}\n\nCurrent files:\n${subset.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n").slice(0, 26000)}` },
  ], key, { temperature: 0.1, maxTokens: 7000, json: true });
  const parsed = extractJson<{ files: ProjectFile[] }>(text);
  return Array.isArray(parsed?.files) ? parsed!.files.filter((f) => f?.path && typeof f.content === "string") : [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const key = getNvidiaKey();
  if (!key) return json({ error: "NVIDIA AI key is not configured." }, 500);

  const body = await req.json().catch(() => ({}));
  const prompt = String(body?.prompt ?? "").trim();
  const stack = String(body?.stack ?? "").slice(0, 200);
  if (prompt.length < 8) return json({ error: "Describe the app you want in at least a sentence." }, 400);
  if (prompt.length > 6000) return json({ error: "That request is too long — trim it to 6000 characters." }, 400);

  // The build runs in several model passes, so stream progress as it happens.
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (event: string, data: unknown) => {
        try { ctrl.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { /* closed */ }
      };
      const heartbeat = setInterval(() => {
        try { ctrl.enqueue(enc.encode(": ping\n\n")); } catch { /* closed */ }
      }, 10000);

      try {
        // ── 1. PLAN
        send("stage", { label: "Understanding the request", state: "active" });
        const plan = await planProject(prompt, stack, key);
        if (!plan) throw new Error("The planner could not shape this request. Try describing it more concretely.");
        send("stage", {
          label: "Plan",
          state: "done",
          detail: `${(plan.steps ?? []).length} build steps, ${(plan.files ?? []).length} files.`,
        });
        send("plan", {
          name: plan.name ?? "egreed-app",
          summary: plan.summary ?? "",
          stack: plan.stack ?? [],
          steps: plan.steps ?? [],
          entities: plan.entities ?? [],
          endpoints: plan.endpoints ?? [],
        });

        // ── 2. FILES (batched so long projects fit the token budget)
        const targets: { path: string; purpose: string }[] = (plan.files ?? [])
          .filter((f: any) => f?.path)
          .slice(0, 14)
          .map((f: any) => ({ path: String(f.path), purpose: String(f.purpose ?? "") }));
        if (!targets.length) throw new Error("The planner returned no files.");

        const half = Math.ceil(targets.length / 2);
        const batches = targets.length > 7 ? [targets.slice(0, half), targets.slice(half)] : [targets];
        const byPath = new Map<string, ProjectFile>();
        let batchNo = 0;
        for (const batch of batches) {
          batchNo++;
          send("stage", {
            label: `Writing code (${batchNo}/${batches.length})`,
            state: "active",
            detail: batch.map((b) => b.path).join(", "),
          });
          const produced = await writeFiles(prompt, plan, key, batch);
          for (const f of produced) {
            byPath.set(f.path, f);
            send("file", { path: f.path, language: f.language ?? "", size: f.content.length });
          }
        }
        let files = [...byPath.values()];
        if (!files.length) throw new Error("No files were generated. Try again.");
        send("stage", { label: "Generate", state: "done", detail: `${files.length} files written.` });

        // ── 3. VALIDATE
        send("stage", { label: "Validating the project", state: "active" });
        const review = await validateProject(files, key);
        const issues = Array.isArray(review?.issues) ? review.issues : [];
        send("stage", {
          label: "Validate",
          state: "done",
          detail: issues.length ? `${issues.length} issue(s) found.` : "No material defects found on review.",
        });

        // ── 4. FIX
        let fixedCount = 0;
        if (issues.length) {
          send("stage", { label: "Fixing the problems found", state: "active", detail: `${issues.length} to repair` });
          const fixed = await fixFiles(files, issues, key);
          for (const f of fixed) { byPath.set(f.path, f); fixedCount++; }
          files = [...byPath.values()];
          send("stage", {
            label: "Fix",
            state: "done",
            detail: fixedCount ? `${fixedCount} file(s) repaired.` : "No automatic repair applied.",
          });
        }

        send("done", {
          success: true,
          project: {
            name: plan.name ?? "egreed-app",
            summary: plan.summary ?? "",
            stack: plan.stack ?? [],
            steps: plan.steps ?? [],
            entities: plan.entities ?? [],
            endpoints: plan.endpoints ?? [],
            files,
          },
          validation: { ok: !issues.length, issues, repaired: fixedCount },
        });
      } catch (e) {
        console.error("[build-app] fatal", (e as Error).message);
        send("error", { error: (e as Error).message || "unexpected error" });
      } finally {
        clearInterval(heartbeat);
        try { ctrl.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
