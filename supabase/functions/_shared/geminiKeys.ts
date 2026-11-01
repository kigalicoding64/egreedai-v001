// Gemini key pool: built-in secrets first, then keys admins add in the Creator console.
// Used as backup rotation — callers try keys in order and move on when one fails.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

let cache: { keys: string[]; at: number } | null = null;

export async function loadGeminiKeys(signal?: AbortSignal): Promise<string[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.keys;
  const keys = [Deno.env.get("geminapi"), Deno.env.get("gemin11")].filter(Boolean) as string[];
  const url = Deno.env.get("SUPABASE_URL");
  const sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (url && sk) {
    try {
      const { data } = await createClient(url, sk, signal ? { global: { fetch: (input, init) => fetch(input, { ...init, signal }) } } : undefined)
        .from("gemini_api_keys").select("api_key").eq("active", true)
        .order("position").order("created_at");
      for (const r of data ?? []) if (r.api_key && !keys.includes(r.api_key)) keys.push(r.api_key);
    } catch (e) {
      console.error("[gemini-keys] load failed", (e as Error).message);
    }
  }
  cache = { keys, at: Date.now() };
  return keys;
}
