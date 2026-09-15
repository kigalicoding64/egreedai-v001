import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async () => {
  const key = Deno.env.get("nvdiaapi")!;
  const r = await fetch("https://integrate.api.nvidia.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
  const j = await r.json();
  const ids = (j?.data ?? []).map((m: any) => m.id).sort();
  return new Response(JSON.stringify({ count: ids.length, ids }), { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });
});
