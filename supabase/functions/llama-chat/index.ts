import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LLAMA_STACK_URL = Deno.env.get("LLAMA_STACK_URL");
    const LLAMA_STACK_API_KEY = Deno.env.get("LLAMA_STACK_API_KEY");
    const LLAMA_STACK_MODEL = Deno.env.get("LLAMA_STACK_MODEL") || "llama3.1";

    const { messages, stream = true } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      throw new Error("messages array is required");
    }

    // No self-hosted Llama configured → serve the request with NVIDIA AI
    // (OpenAI-compatible stream, so existing clients parse it unchanged).
    if (!LLAMA_STACK_URL) {
      const key = getNvidiaKey();
      if (!key) {
        return new Response(JSON.stringify({ error: "AI is not configured.", notConfigured: true }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const models = ["openai/gpt-oss-20b", "nvidia/nemotron-3.5-lightning-30b-a3b", "nvidia/nemotron-3-super-120b-a12b"];
      let lastErr = "";
      for (const model of models) {
        const msgs = model.startsWith("nvidia/nemotron")
          ? [{ role: "system", content: "detailed thinking off" }, ...messages]
          : messages;
        const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, messages: msgs, stream, temperature: 0.3, max_tokens: 6000 }),
        }).catch((e) => { lastErr = String(e); return null; });
        if (r && r.ok && r.body) {
          return new Response(r.body, {
            headers: { ...corsHeaders, "Content-Type": stream ? "text/event-stream" : "application/json" },
          });
        }
        if (r) lastErr = `${r.status} ${await r.text().catch(() => "")}`.slice(0, 300);
        console.error("[llama-chat] nvidia fallback failed", model, lastErr);
      }
      return new Response(JSON.stringify({ error: "AI generation is temporarily unavailable. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (LLAMA_STACK_API_KEY) {
      headers["Authorization"] = `Bearer ${LLAMA_STACK_API_KEY}`;
    }

    const body = JSON.stringify({
      model: LLAMA_STACK_MODEL,
      messages,
      stream,
    });

    const response = await fetch(LLAMA_STACK_URL, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Llama stack error:", response.status, text);
      return new Response(
        JSON.stringify({ error: `Llama stack returned ${response.status}: ${text}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (stream && response.body) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("llama-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
