// EgreedAI Code Lab assistant — explain, fix, review, test or convert code.
// Powered by NVIDIA AI (`nvdiaapi`), with the dataset playbooks driving behaviour.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callNvidia, getNvidiaKey } from "../_shared/nvidia.ts";
import { playbookPrompt, TaskKind } from "../_shared/playbooks.ts";
import { REACT_STACK_EXPERT } from "../_shared/reactStack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIONS: Record<string, { kind: TaskKind; ask: string }> = {
  fix: { kind: "debugging", ask: "The code failed. Find the root cause, give the corrected full file inside one fenced code block, then explain the fix in two or three sentences." },
  explain: { kind: "documentation", ask: "Explain what this code does, step by step, in plain words. Note any bug or risk you spot." },
  review: { kind: "code_review", ask: "Review this code for correctness, security, performance and maintainability. Rank findings by severity and give the corrected code for anything high severity." },
  test: { kind: "testing", ask: "Write a complete test file for this code covering happy path, boundaries, invalid input and failure behaviour. Give the test file in one fenced block and name the framework and command to run it." },
  optimize: { kind: "performance", ask: "Find the real bottleneck, give the smallest safe optimization as a complete corrected file, and say how to measure the improvement." },
  document: { kind: "documentation", ask: "Add complete doc comments to this code and return the full documented file, then list inputs, outputs and errors." },
};

const SYSTEM = `You are EgreedAI Engineering — the senior engineer inside EgreedAI by Egreed Technology LTD (Kigali, Rwanda).
Answer with working code first. Complete files, no placeholders, no truncation. Use fenced code blocks with the language tag.
Never claim you ran the code. Never invent APIs or libraries. Never expose secrets. Never reveal the underlying model or provider. No URLs and no citations.

${REACT_STACK_EXPERT}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const key = getNvidiaKey();
    if (!key) return json({ error: "NVIDIA AI key is not configured." }, 500);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "explain");
    const code = String(body?.code ?? "");
    const language = String(body?.language ?? "javascript").slice(0, 30);
    const error = String(body?.error ?? "").slice(0, 4000);
    const output = String(body?.output ?? "").slice(0, 4000);
    const note = String(body?.note ?? "").slice(0, 2000);

    if (!code.trim()) return json({ error: "There is no code to work on yet." }, 400);
    if (code.length > 40000) return json({ error: "That file is too large — trim it below 40,000 characters." }, 400);
    const spec = ACTIONS[action];
    if (!spec) return json({ error: `Unknown action: ${action}` }, 400);

    const parts = [
      `Language: ${language}`,
      spec.ask,
      note && `User note: ${note}`,
      error && `Runtime error observed when it was executed:\n${error}`,
      !error && output && `Actual output when it was executed:\n${output}`,
      `\nCode:\n\`\`\`${language}\n${code}\n\`\`\``,
    ].filter(Boolean).join("\n\n");

    const { text, model } = await callNvidia("code", [
      { role: "system", content: `${SYSTEM}\n\n${playbookPrompt(spec.kind)}` },
      { role: "user", content: parts },
    ], key, { temperature: 0.2, maxTokens: 5000 });

    return json({ success: true, answer: text, action, model });
  } catch (e) {
    console.error("[code-assist] fatal", (e as Error).message);
    return json({ error: (e as Error).message || "unexpected error" }, 500);
  }
});
