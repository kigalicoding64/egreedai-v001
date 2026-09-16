// NVIDIA AI (NIM) provider — OpenAI-compatible endpoint.
// Secret: `nvdiaapi`. Used as the primary engine for software engineering work.
const NVIDIA_BASE = "https://integrate.api.nvidia.com/v1";

export function getNvidiaKey(): string | undefined {
  return Deno.env.get("nvdiaapi") || Deno.env.get("NVIDIA_API_KEY") || undefined;
}

// Preference ladder per job. First id that the account can actually serve wins.
const PREFERENCE: Record<string, string[]> = {
  // Verified live against this account (2026-09): these ids answer; others 404 or stall.
  code: [
    "nvidia/nemotron-3-super-120b-a12b",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    "openai/gpt-oss-20b",
    "z-ai/glm-5.3",
  ],
  reason: [
    "nvidia/nemotron-3-super-120b-a12b",
    "z-ai/glm-5.3",
    "nvidia/nemotron-3.5-lightning-30b-a3b",
  ],
  text: [
    "nvidia/nemotron-3.5-lightning-30b-a3b",
    "nvidia/nemotron-3-super-120b-a12b",
    "openai/gpt-oss-20b",
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
  /** Per-attempt timeout in ms. Slow or stuck models are dropped for the next candidate. */
  timeoutMs?: number;
}

/** Ordered list of candidate models the account can actually serve. */
export async function nvidiaCandidates(kind: "code" | "reason" | "text", key: string): Promise<string[]> {
  const prefs = PREFERENCE[kind] ?? PREFERENCE.text;
  const available = await loadCatalog(key);
  const list = available.size ? prefs.filter((id) => available.has(id)) : prefs;
  return list.length ? list : [prefs[prefs.length - 1]];
}

async function attempt(
  model: string,
  messages: { role: string; content: string }[],
  key: string,
  kind: "code" | "reason" | "text",
  opts: NvidiaOpts,
): Promise<string> {
  // Nemotron models leak their internal analysis into `content` unless thinking is off.
  const msgs = /nemotron/i.test(model)
    ? [{ role: "system", content: "detailed thinking off" }, ...messages]
    : messages;
  const body: Record<string, unknown> = {
    model,
    messages: msgs,
    temperature: opts.temperature ?? (kind === "code" ? 0.2 : 0.6),
    max_tokens: opts.maxTokens ?? 4096,
    stream: false,
  };
  if (opts.json) body.response_format = { type: "json_object" };
  // Stream so a long answer is judged on time-to-first-token, not total generation time.
  body.stream = true;

  const ctrl = new AbortController();
  const idleMs = opts.timeoutMs ?? 25000;
  const hardMs = 150000;
  let idle = setTimeout(() => ctrl.abort(), idleMs);
  const hard = setTimeout(() => ctrl.abort(), hardMs);
  const bump = () => {
    clearTimeout(idle);
    idle = setTimeout(() => ctrl.abort(), idleMs);
  };

  try {
    const r = await fetch(`${NVIDIA_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) throw new Error(`nvidia ${r.status} (${model}): ${(await r.text()).slice(0, 300)}`);
    if (!r.body) throw new Error(`nvidia no stream body (${model})`);

    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bump();
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const s = line.trim();
        if (!s.startsWith("data:")) continue;
        const payload = s.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload);
          out += String(j?.choices?.[0]?.delta?.content ?? "");
        } catch { /* partial frame */ }
      }
    }

    const text = out.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (!text) throw new Error(`nvidia empty reply (${model})`);
    return text;
  } finally {
    clearTimeout(idle);
    clearTimeout(hard);
  }
}

/** Non-streaming NVIDIA chat completion with automatic model failover. */
export async function callNvidia(
  kind: "code" | "reason" | "text",
  messages: { role: string; content: string }[],
  key: string,
  opts: NvidiaOpts = {},
): Promise<{ text: string; model: string }> {
  const models = opts.model ? [opts.model] : await nvidiaCandidates(kind, key);
  let last: Error | null = null;
  for (const model of models.slice(0, 4)) {
    try {
      const text = await attempt(model, messages, key, kind, opts);
      return { text, model };
    } catch (e) {
      last = e as Error;
      console.error("[nvidia] attempt failed", model, last.message);
    }
  }
  throw last ?? new Error("nvidia: no model available");
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
