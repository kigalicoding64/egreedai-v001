// Builder AI endpoint. Uses the same single configured key as chat (one bounded
// request, no alternate model/provider retry) and returns an OpenAI-style SSE
// stream so the builder clients parse it unchanged.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { loadGeminiKeys } from "../_shared/geminiKeys.ts";
import { ProviderError, requestReply, selectProvider } from "../_shared/provider.ts";

const BodySchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant"]),
    content: z.string().min(1).max(60_000),
  })).min(1).max(40),
  stream: z.boolean().optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Send a valid messages array." }, 400);
    const { messages, stream = true } = parsed.data;

    const selected = selectProvider(await loadGeminiKeys(controller.signal), Deno.env.get("openai") || Deno.env.get("openai1"));
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: access } = await admin.from("chat_provider_access_state")
      .select("denied").eq("provider", selected.provider).maybeSingle();
    if (access?.denied) return json({ error: "The configured AI connection is blocked. An admin must restore access. No other provider was used." }, 403);

    const answer = await requestReply(selected.provider, selected.key, messages, controller.signal, fetch, 16384);
    if (!stream) return json({ choices: [{ message: { role: "assistant", content: answer } }] });
    const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: answer } }] })}\n\ndata: [DONE]\n\n`;
    return new Response(sse, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (error) {
    if (controller.signal.aborted) return json({ error: "The AI took too long. Please try again. No other provider was used." }, 504);
    if (error instanceof ProviderError) return json({ error: error.message }, error.status);
    console.error("[llama-chat] failed", error instanceof Error ? error.message : error);
    return json({ error: "AI generation failed. No other provider was used." }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
