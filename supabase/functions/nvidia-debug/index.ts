import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BASE = "https://integrate.api.nvidia.com/v1";
const H = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

async function probe(key: string, model: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  const started = Date.now();
  try {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: "Say OK." }], max_tokens: 16, stream: false }),
      signal: ctrl.signal,
    });
    const ms = Date.now() - started;
    if (!r.ok) return { model, ok: false, status: r.status, ms, detail: (await r.text()).slice(0, 120) };
    const j = await r.json();
    return { model, ok: true, status: 200, ms, sample: String(j?.choices?.[0]?.message?.content ?? "").slice(0, 40) };
  } catch (e) {
    return { model, ok: false, status: 0, ms: Date.now() - started, detail: (e as Error).message };
  } finally {
    clearTimeout(t);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: H });
  const key = Deno.env.get("nvdiaapi") || Deno.env.get("NVIDIA_API_KEY") || "";
  if (!key) return new Response(JSON.stringify({ error: "no key" }), { status: 500, headers: H });

  const body = await req.json().catch(() => ({} as any));
  const models: string[] | undefined = Array.isArray(body?.models) ? body.models : undefined;

  if (!models) {
    const r = await fetch(`${BASE}/models`, { headers: { Authorization: `Bearer ${key}` } });
    const j = await r.json();
    const ids = (j?.data ?? []).map((m: any) => m.id).sort();
    return new Response(JSON.stringify({ count: ids.length, ids }), { headers: H });
  }

  const results = await Promise.all(models.slice(0, 12).map((m) => probe(key, m)));
  return new Response(JSON.stringify({ results }), { headers: H });
});
