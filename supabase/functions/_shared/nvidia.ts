// NVIDIA AI (NIM) provider — OpenAI-compatible endpoint.
// Secret: `nvdiaapi`. Used as the primary engine for software engineering work.
const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

export function getNvidiaKey(): string | undefined {
  return Deno.env.get("nvdiaapi") || Deno.env.get("NVIDIA_API_KEY") || undefined;
}

// Preference ladder per job. First id that the account can actually serve wins.
const PREFERENCE: Record<string, string[]> = {
  code: [
    "qwen/qwen3-coder-480b-a35b-instruct",
    "qwen/qwen2.5-coder-32b-instruct",
    "deepseek-ai/deepseek-v3.1",
    "moonshotai/kimi-k2-instruct",
    "nvidia/llama-3.3-nemotron-super-49b-v1",
    "meta/llama-3.3-70b-instruct",
  ],
  reason: [
    "deepseek-ai/deepseek-r1",
    "nvidia/llama-3.3-nemotron-super-49b-v1",
    "qwen/qwen3-next-80b-a3b-thinking",
    "meta/llama-3.3-70b-instruct",
  ],
  text: [
    "meta/llama-3.3-70b-instruct",
    "nvidia/llama-3.3-nemotron-super-49b-v1",
    "qwen/qwen2.5-coder-32b-instruct",
  ],
};

let catalog: Set<string> | null = null;
let catalogAt = 0;

async function loadCatalog(key: string): Promise<Set<string>> {
  const fresh = catalog && Date.now() - catalogAt < 10 * 60 * 1000;
  if (fresh) return catalog!;
  try {
    const r = await fetch(`${NVIDIA_BASE}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (r.ok) {
      const j = await r.json();
      const ids = (j?.data ?? []).map((m: any) => String(m?.id ?? "")).filter(Boolean);
      if (ids.length) {
        catalog = new Set(ids);
        catalogAt = Date.now();
        return catalog;
      }
    }
  } catch (e) {
    console.error("[nvidia] catalog fail", (e as Error).message);
  }
  catalog = new Set();
  catalogAt = Date.now();
  return catalog;
}

export async function pickNvidiaModel(kind: "code" | "reason" | "text", key: string): Promise<string> {
  const prefs = PREFERENCE[kind] ?? PREFERENCE.text;
  const available = await loadCatalog(key);
  if (available.size) {
    for (const id of prefs) if (available.has(id)) return id;
    // Fall back to any coder/instruct model the account has.
    const anyCoder = [...available].find((id) => /coder/i.test(id));
    if (anyCoder && kind === "code") return anyCoder;
    const anyInstruct = [...available].find((id) => /instruct/i.test(id));
    if (anyInstruct) return anyInstruct;
  }
  return prefs[prefs.length - 1];
}

export interface NvidiaOpts {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  model?: string;
}

/** Non-streaming NVIDIA chat completion. Returns assistant text. */
export async function callNvidia(
  kind: "code" | "reason" | "text",
  messages: { role: string; content: string }[],
  key: string,
  opts: NvidiaOpts = {},
): Promise<{ text: string; model: string }> {
  const model = opts.model ?? (await pickNvidiaModel(kind, key));
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? (kind === "code" ? 0.2 : 0.6),
    max_tokens: opts.maxTokens ?? 4096,
    stream: false,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const r = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`nvidia ${r.status} (${model}): ${(await r.text()).slice(0, 400)}`);
  const data = await r.json();
  let text = String(data?.choices?.[0]?.message?.content ?? "");
  // Reasoning models can emit <think> blocks — strip them from user-facing text.
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  return { text, model };
}

/** Extract the first JSON object/array from a model reply, tolerating fences and prose. */
export function extractJson<T = any>(raw: string): T | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "```")
    .trim();
  const fenced = cleaned.match(/```([\s\S]*?)```/);
  const candidates = [fenced?.[1], cleaned].filter(Boolean) as string[];
  for (const c of candidates) {
    const s = c.trim();
    const start = s.search(/[[{]/);
    if (start < 0) continue;
    const open = s[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < s.length; i++) {
      const ch = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(s.slice(start, i + 1)) as T; } catch { break; }
        }
      }
    }
  }
  return null;
}
