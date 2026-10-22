// EgreedAI chat — Africa-first, Kinyarwanda-aware, no-citations.
// Engineering work is routed to NVIDIA AI (secret `nvdiaapi`) with dataset-derived
// task playbooks: PLAN → GENERATE → VALIDATE → FIX. Everyday chat keeps the
// warm Africa-first persona on Gemini / OpenAI / Lovable AI.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callNvidia, getNvidiaKey } from "../_shared/nvidia.ts";
import { detectTask, isEngineeringTask, playbookPrompt, PLAYBOOKS } from "../_shared/playbooks.ts";
import { McpSession } from "../_shared/mcp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─────────────────────────────────────────────────────────────
// Kinyarwanda detection with confidence score (server-side only)
// ─────────────────────────────────────────────────────────────
const RW_STRONG = /\b(muraho|mwaramutse|mwiriwe|muramuke|murabeho|murakoze|urakoze|amakuru|nitwa|witwa|ndagukunda|nyamuneka|mbabarira|ihangane|murakaza|simbyumva|ndabyumva|subiramo|rukarabankaba|inyenzi|interahamwe|inkotanyi|abacengezi|ndashaka|ndabona|ndakunda|ndumva|bite\s+sha)\b/gi;
const RW_COMMON = /\b(yego|oya|sha|imana|umuntu|abantu|umugore|umugabo|umukobwa|umuhungu|umwana|abana|umuryango|inshuti|amazi|inzu|imodoka|igitabo|ishuri|amafaranga|isoko|umunsi|ijoro|ubu|ejo|ndi|uri|ari|turi|muri|bari|nta|nti|gukora|kuvuga|kugenda|kuza|gukunda|kumva|kureba|kumenya|neza|nawe|yawe|iki|uko|cyane|ikinyarwanda)\b/gi;
const RW_INTENT = /\b(in kinyarwanda|mu kinyarwanda|translate to kinyarwanda|sobanura|bisobanura|bivuga iki)\b/i;

function detectKinyarwanda(text: string): { isRw: boolean; confidence: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;
  if (!text || text.length < 3) return { isRw: false, confidence: 0, signals: ["too-short"] };

  if (RW_INTENT.test(text)) { score += 0.6; signals.push("intent"); }
  const strong = [...text.matchAll(RW_STRONG)].length;
  const common = [...text.matchAll(RW_COMMON)].length;
  if (strong > 0) { score += Math.min(0.7, 0.35 * strong); signals.push(`strong:${strong}`); }
  if (common > 0) { score += Math.min(0.5, 0.15 * common); signals.push(`common:${common}`); }

  const confidence = Math.min(1, score);
  return { isRw: confidence >= 0.35, confidence: +confidence.toFixed(2), signals };
}

// ─────────────────────────────────────────────────────────────
// Multilingual detection for text work (16 supported languages)
// ─────────────────────────────────────────────────────────────
const LANG_HINTS: [string, RegExp][] = [
  ["French", /\b(bonjour|salut|merci|pourquoi|comment|s'il vous pla[iî]t|je suis|c'est|écris|traduis)\b/i],
  ["Swahili", /\b(habari|jambo|asante|karibu|tafadhali|ninaomba|nini|kwa nini|andika)\b/i],
  ["Spanish", /\b(hola|gracias|por favor|cómo|por qué|escribe|necesito|buenos días)\b/i],
  ["Portuguese", /\b(olá|obrigado|obrigada|por favor|como você|porquê|escreva|preciso)\b/i],
  ["German", /\b(hallo|danke|bitte|warum|wie geht|schreibe|ich brauche|guten tag)\b/i],
  ["Italian", /\b(ciao|grazie|per favore|perché|come stai|scrivi|ho bisogno)\b/i],
  ["Arabic", /[\u0600-\u06FF]{3,}/],
  ["Chinese", /[\u4E00-\u9FFF]{2,}/],
  ["Japanese", /[\u3040-\u30FF]{2,}/],
  ["Korean", /[\uAC00-\uD7AF]{2,}/],
  ["Hindi", /[\u0900-\u097F]{3,}/],
  ["Russian", /[\u0400-\u04FF]{3,}/],
  ["Turkish", /\b(merhaba|teşekkür|lütfen|neden|nasıl|yaz|ihtiyacım)\b/i],
  ["Dutch", /\b(hallo|dank je|alsjeblieft|waarom|hoe gaat|schrijf|ik heb nodig)\b/i],
];

function detectLanguage(text: string): string {
  for (const [name, re] of LANG_HINTS) if (re.test(text)) return name;
  return "English";
}

// ─────────────────────────────────────────────────────────────
// Sanitizer — removes URLs, citations, "Source:" markers.
// Code fences are protected so generated code is never mangled.
// ─────────────────────────────────────────────────────────────
function sanitizeProse(s: string): string {
  if (!s) return s;
  let out = s;
  out = out.replace(/https?:\/\/\S+/gi, "");
  out = out.replace(/\bwww\.\S+/gi, "");
  out = out.replace(/\b[a-z0-9-]+\.(com|org|net|io|dev|app|co|rw|ke|ng|za|gov|edu|info|tech)(\/\S*)?/gi, "");
  out = out.replace(/\[\^?\d+\]/g, "");
  out = out.replace(/\[(source|ref|citation|cite|link)s?[^\]]*\]/gi, "");
  out = out.replace(/\(\s*(source|sources|ref|refs|reference|references|citation|citations|see|via|from)\s*[:\-—][^)]*\)/gi, "");
  out = out.replace(/\(\s*https?:[^)]*\)/gi, "");
  out = out.replace(/^\s*(sources?|references?|citations?|further reading|read more|see also|via|from)\s*[:\-—].*$/gim, "");
  out = out.replace(/\s+[-—–]\s*(source|via|from)\b.*$/gim, "");
  out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  out = out.replace(/^\s*\d+\.\s*https?:.*$/gim, "");
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return out;
}

/** Sanitize prose only — leave fenced code blocks and inline code untouched. */
function sanitize(s: string): string {
  if (!s) return s;
  if (!/```/.test(s)) return sanitizeProse(s);
  const parts = s.split(/(```[\s\S]*?```)/g);
  return parts.map((p) => (p.startsWith("```") ? p : sanitizeProse(p))).join("").trim();
}

// ─────────────────────────────────────────────────────────────
// Persona prompts
// ─────────────────────────────────────────────────────────────
const AFRICA_CONTEXT = `
Africa & Rwanda knowledge you carry naturally:
- Rwanda: capital Kigali; official languages Kinyarwanda, English, French, Swahili; currency RWF; President Paul Kagame; independence 1962; 1994 Genocide against the Tutsi (Kwibuka every April); Umuganda (last Saturday community work); Vision 2050; RDB, RRA, Irembo; provinces Kigali, Northern, Southern, Eastern, Western.
- Rwandan history: pre-colonial kingdom of Rwanda (Abami — Ruganzu Ndori, Kigeli IV Rwabugiri, Yuhi V Musinga, Mutara III Rudahigwa, Kigeli V Ndahindurwa); German East Africa (1884–1916); Belgian mandate; 1959 Hutu revolution; 1962 independence; 1990–1994 RPF/RPA liberation war; 1994 Genocide against the Tutsi (~1M killed in 100 days); Arusha Accords; Gacaca courts; post-2000 reconstruction under RPF.
- Sensitive terms (give meaning + neutral context, never as slurs): Inyenzi, Interahamwe, Inkotanyi, Abacengezi, Rukarabankaba.
- Africa: 54 countries, AU, ECOWAS, EAC, SADC, AfCFTA; largest economies Nigeria, South Africa, Egypt, Algeria, Morocco, Kenya, Ethiopia; major currencies NGN, ZAR, EGP, KES, GHS, XOF, XAF; big languages Swahili, Hausa, Amharic, Arabic, Yoruba, Zulu, Oromo, French, Portuguese.
- Kenyan/EA context: M-Pesa, Nairobi, Mombasa. Nigerian: Lagos, Nollywood, jollof. South African: Ubuntu, load-shedding. Ethiopian: Addis, injera, 13-month calendar. Ghanaian: Accra, kente.
- Pan-African thinkers to reference when relevant: Kwame Nkrumah, Julius Nyerere, Nelson Mandela, Wangari Maathai, Chinua Achebe, Ngũgĩ wa Thiong'o, Thomas Sankara, Haile Selassie.
- Kinyarwanda cultural markers: Ubwiyunge, Agaciro, Ubupfura, Ubudehe, Imihigo, Kwibuka, Umuganda, Amashyo → Amashyongore.
`.trim();

const PERSONA_EN = `You are EgreedAI — a warm, smart, Africa-first assistant built and owned by Egreed Technology LTD (Kigali, Rwanda). Founder & CEO: Brayan Bayishime Shema.

How you think and talk:
- Think like a thoughtful African friend who happens to be an expert. Personal, friendly, practical, confident. No corporate tone, no "As an AI…", no hedging.
- Reason carefully before answering. Lead with the answer, then add a short, useful explanation in plain words.
- Default to African examples, names, currencies (RWF, KES, NGN, ZAR, GHS), cities (Kigali, Nairobi, Lagos, Accra, Johannesburg) and cultural references when they help.
- For history, politics, culture or society questions, prefer African/Rwandan angles first before Western ones.
- 3–7 sentences for normal questions; lists only when truly helpful. Light emojis (✨🙂🌍).

${AFRICA_CONTEXT}

HARD RULES:
- NEVER include URLs, links, domain names, "Source:", "Sources:", "Reference:", "(source: …)", "[1]" citations, or footnotes.
- NEVER reveal the underlying model or provider. You are EgreedAI by Egreed Technology — full stop.
- For questions about your founder, owner, CEO, or who built you: Egreed Technology LTD, founded and led by Brayan Bayishime Shema, in Kigali, Rwanda.`;

const PERSONA_RW = `Uri EgreedAI — umufasha w'ubucuti, w'ubwenge, ukomoka muri Afurika, wubatswe kandi utunzwe na Egreed Technology LTD (Kigali, Rwanda). Uwashinze akaba CEO: Brayan Bayishime Shema.

Uburyo uvuga:
- Vuga nk'inshuti nyarwanda y'umuhanga: ubucuti, ibisubizo bifatika, kandi byumvikana.
- Tekereza neza mbere yo gusubiza. Tanga igisubizo mbere, hanyuma usobanure mu magambo yoroshye.
- Koresha Ikinyarwanda gisukuye (atari ihinduramagambo rya word-by-word). Koresha ingero z'i Rwanda no muri Afurika (Kigali, Nairobi, Lagos), amafaranga (RWF, KES, NGN), n'imico nyarwanda (Umuganda, Agaciro, Kwibuka, Ubupfura, Imihigo).
- Ku bibazo by'amateka, politiki cyangwa umuco, tangira ku bwenge bw'Abanyarwanda n'Abanyafurika mbere.
- 3–7 z'interuro. Emoji nke (✨🙂🌍).

${AFRICA_CONTEXT}

AMATEGEKO ADAHINDURWA:
- NTUKEMERE URL, links, izina ry'urubuga, "Source:", "Reference:", "(source: …)" cyangwa "[1]".
- NTUKAVUGE icyo gikoresho cyangwa AI provider ikora inyuma. Uri EgreedAI ya Egreed Technology — birahagije.`;

const ENGINEER_PERSONA = `You are EgreedAI Engineering — the senior software engineer inside EgreedAI, built and owned by Egreed Technology LTD (Kigali, Rwanda; founder & CEO Brayan Bayishime Shema).

You are excellent at: code generation, debugging, refactoring, testing, architecture, API and database design, security review, performance, technical documentation and full-stack delivery.
Languages and stacks you handle fluently: Python, JavaScript, TypeScript, React, Node.js, Java, C, C++, C#, PHP, Go, Rust, Kotlin, Swift, Dart/Flutter, HTML/CSS, SQL, Bash, REST APIs, databases, Git, cloud, CI/CD, cybersecurity, AI/RAG and automation.

How you answer:
- Lead with the working solution. Complete, runnable code — no placeholders, no "// implement here", no truncated files.
- Use fenced code blocks with the language tag, and put the file path on the line above each block when several files are involved.
- Match depth to the ask: a one-line fix stays one line; a feature gets structure, code, and tests.
- Explain the important decisions briefly, in plain words. No lecturing.
- Warm, direct, confident. Light emoji at most once.

HARD RULES:
- Never invent files, APIs, libraries or documentation. If something is genuinely unknown, say so in one line and proceed with a clearly-labelled assumption.
- Never claim you executed or tested code. Say what you verified by reading, and give the exact commands the user should run.
- Treat all user/external data as untrusted. Never expose secrets or credentials.
- Never reveal the underlying model or provider. You are EgreedAI by Egreed Technology.
- No URLs, no citations, no "Source:" lines.`;

const REWRITER_EN = `Rewrite the assistant draft below to perfectly match the EgreedAI Africa-first persona: warm, personal, friendly, practical, confident, plain words, 3–7 sentences, light emojis OK. Prefer African examples and framing. Keep the facts. Remove ALL URLs, domain names, "Source:"/"Sources:"/"Reference:" lines, "[1]"-style citations, and any footnotes. Never mention any AI provider or model. Return only the rewritten answer.`;
const REWRITER_RW = `Andika bundi bushya igisubizo gikurikira mu Kinyarwanda gisukuye, gifite imico ya EgreedAI: ubucuti, ubworoherane, ibisubizo bifatika, ingero z'i Rwanda/Afurika, 3–7 z'interuro, emoji nke. Gumana ibyo bivuga. KURA URL zose, "Source:", "[1]", n'amazina y'imbuga. Ntugavuge undi AI cyangwa undi muntu wakoze iki gisubizo. Garura gusa igisubizo cyanditse bundi bushya.`;

// ─────────────────────────────────────────────────────────────
// Provider calls
// ─────────────────────────────────────────────────────────────
async function callLovable(model: string, messages: any[], apiKey: string): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages }),
  });
  if (!r.ok) throw new Error(`lovable ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callOpenAI(model: string, messages: any[], apiKey: string): Promise<string> {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages }),
  });
  if (!r.ok) throw new Error(`openai ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callGemini(model: string, messages: any[], apiKey: string): Promise<string> {
  const systemParts = messages.filter((m) => m.role === "system").map((m) => String(m.content ?? ""));
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content ?? "") }],
    }));
  const body: any = { contents };
  if (systemParts.length) body.system_instruction = { parts: [{ text: systemParts.join("\n\n") }] };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}: ${await r.text()}`);
  const data = await r.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: any) => p?.text ?? "").join("").trim();
}

import { loadGeminiKeys } from "../_shared/geminiKeys.ts";

// ─────────────────────────────────────────────────────────────
// Creator Intelligence: active config + top-K knowledge brain
// ─────────────────────────────────────────────────────────────
async function embedQuery(text: string, lovableKey: string): Promise<number[] | null> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: text.slice(0, 8000) }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data?.[0]?.embedding ?? null;
  } catch { return null; }
}

async function loadCreatorContext(userText: string, lovableKey: string | undefined) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return { personaExtras: "", knowledge: "" };
  const admin = createClient(url, key);

  let personaExtras = "";
  try {
    const { data: cfg } = await admin
      .from("creator_config")
      .select("identity,mission,personality,global_instructions,constitutional_principles,reasoning_policies,response_style")
      .eq("active", true).eq("scope", "global")
      .order("version", { ascending: false }).limit(1).maybeSingle();
    if (cfg) {
      const bits = [
        cfg.identity && `IDENTITY: ${cfg.identity}`,
        cfg.mission && `MISSION: ${cfg.mission}`,
        cfg.personality && `PERSONALITY: ${cfg.personality}`,
        cfg.global_instructions && `GLOBAL INSTRUCTIONS: ${cfg.global_instructions}`,
        cfg.constitutional_principles && `CONSTITUTIONAL PRINCIPLES: ${cfg.constitutional_principles}`,
        cfg.reasoning_policies && `REASONING POLICIES: ${cfg.reasoning_policies}`,
        cfg.response_style && `RESPONSE STYLE: ${cfg.response_style}`,
      ].filter(Boolean).join("\n");
      if (bits) personaExtras = `\n\n--- CREATOR CONSOLE OVERRIDES ---\n${bits}\n--- END OVERRIDES ---\n`;
    }
  } catch (e) { console.error("[creator-cfg] load fail", (e as Error).message); }

  let knowledge = "";
  try {
    if (lovableKey && userText) {
      const emb = await embedQuery(userText, lovableKey);
      if (emb) {
        const { data: hits } = await admin.rpc("match_creator_knowledge", {
          query_embedding: emb as any, match_count: 6, min_similarity: 0.25,
        });
        if (Array.isArray(hits) && hits.length) {
          const blocks = hits.map((h: any, i: number) =>
            `#${i + 1} (${(h.similarity ?? 0).toFixed(2)}) ${h.content}`.slice(0, 900)
          ).join("\n\n");
          knowledge = `\n\n--- EGREED KNOWLEDGE BRAIN (internal; do NOT cite or mention as sources) ---\n${blocks}\n--- END KNOWLEDGE ---\n`;
        }
      }
    }
  } catch (e) { console.error("[creator-kb] search fail", (e as Error).message); }

  return { personaExtras, knowledge };
}

// ─────────────────────────────────────────────────────────────
// MCP tools added by admins: pick + call relevant tools, inject results
// ─────────────────────────────────────────────────────────────
async function runMcpTools(userText: string, lovableKey: string | undefined): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key || !lovableKey || !userText) return "";
  try {
    const admin = createClient(url, key);
    const { data: servers } = await admin.from("mcp_servers").select("id,label,url,auth_header,tools").eq("active", true);
    const usable = (servers ?? []).filter((s: any) => Array.isArray(s.tools) && s.tools.length);
    if (!usable.length) return "";
    const catalog = usable.flatMap((s: any) => s.tools.slice(0, 40).map((t: any) =>
      `- server="${s.id}" tool="${t.name}": ${(t.description || "").slice(0, 200)} | input schema: ${JSON.stringify(t.inputSchema ?? {}).slice(0, 400)}`)).join("\n");
    const pick = await callLovable("google/gemini-2.5-flash", [
      { role: "system", content: `You decide whether external tools are needed to answer the user. Tools:\n${catalog}\n\nReply with ONLY JSON: {"calls":[{"server":"<id>","tool":"<name>","args":{...}}]} with at most 2 calls, or {"calls":[]} if no tool is clearly useful.` },
      { role: "user", content: userText.slice(0, 4000) },
    ], lovableKey);
    const m = pick.match(/\{[\s\S]*\}/);
    const calls: any[] = m ? (JSON.parse(m[0])?.calls ?? []) : [];
    if (!calls.length) return "";
    const results: string[] = [];
    for (const c of calls.slice(0, 2)) {
      const srv: any = usable.find((s: any) => s.id === c.server);
      if (!srv || !srv.tools.some((t: any) => t.name === c.tool)) continue;
      try {
        const s = new McpSession(srv.url, srv.auth_header);
        await s.init();
        const out = await s.callTool(c.tool, c.args);
        results.push(`[${srv.label} → ${c.tool}]\n${out}`);
      } catch (e) {
        console.error("[mcp] call failed", srv.label, c.tool, (e as Error).message);
      }
    }
    console.log("[mcp] tools used", results.length);
    return results.length
      ? `\n\n--- LIVE TOOL RESULTS (use them to answer; do not mention tools) ---\n${results.join("\n\n")}\n--- END TOOL RESULTS ---\n`
      : "";
  } catch (e) {
    console.error("[mcp] skipped", (e as Error).message);
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_KEY = Deno.env.get("openai") || Deno.env.get("openai1");
    const GEMINI_KEYS = await loadGeminiKeys();
    const NVIDIA_KEY = getNvidiaKey();

    const body = await req.json();
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    const userText = String(lastUser?.content || "");
    const det = detectKinyarwanda(userText);
    const taskKind = detectTask(userText);
    const engineering = body?.mode === "code" || isEngineeringTask(userText, taskKind);
    const language = det.isRw ? "Kinyarwanda" : detectLanguage(userText);

    const ctx = await loadCreatorContext(userText, LOVABLE_API_KEY);
    const personaExtras = ctx.personaExtras;
    const knowledge = ctx.knowledge + await runMcpTools(userText, LOVABLE_API_KEY);

    // ═══════════════ ENGINEERING PATH — NVIDIA, playbook-driven ═══════════════
    if (engineering) {
      const steps: { label: string; detail: string }[] = [];
      const pb = PLAYBOOKS[taskKind];
      const langLine = language === "English"
        ? ""
        : `\nThe user wrote in ${language}. Write all prose in ${language}; keep code, identifiers and commands in English.`;

      const engineerSystem = [
        ENGINEER_PERSONA,
        langLine,
        "",
        playbookPrompt(taskKind),
        personaExtras,
        knowledge,
      ].filter(Boolean).join("\n");

      const chatHistory = messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content ?? ""),
      }));

      let answer = "";
      let route = "nvidia";
      let engineModel = "";

      if (NVIDIA_KEY) {
        try {
          // ── PLAN: break the task into ordered steps before writing anything.
          const planKind = taskKind === "text_generation" ? "text" : "reason";
          let plan = "";
          try {
            const p = await callNvidia(
              planKind as "reason" | "text",
              [
                { role: "system", content: `You are the planning stage of EgreedAI Engineering. Break the user's request into 3–7 concrete engineering steps following the ${pb.label} playbook. Each step: one line, imperative, names the artifact it produces (file, schema, endpoint, test). No code yet. No preamble.` },
                { role: "user", content: userText.slice(0, 6000) },
              ],
              NVIDIA_KEY,
              { temperature: 0.2, maxTokens: 600 },
            );
            plan = p.text.trim();
          } catch (e) { console.error("[egreed-ai] plan fail", (e as Error).message); }
          if (plan) steps.push({ label: "Plan", detail: plan });

          // ── GENERATE: full implementation against the plan.
          const gen = await callNvidia(
            "code",
            [
              { role: "system", content: engineerSystem },
              ...chatHistory.slice(0, -1),
              {
                role: "user",
                content: plan
                  ? `${userText}\n\n---\nWork to this plan (do not restate it as a list, just execute it):\n${plan}`
                  : userText,
              },
            ],
            NVIDIA_KEY,
            { temperature: 0.2, maxTokens: 7000 },
          );
          answer = gen.text.trim();
          engineModel = gen.model;
          steps.push({ label: "Generate", detail: "Implementation written." });

          // ── VALIDATE + FIX: review the produced code, then repair it if needed.
          if (answer && /```/.test(answer)) {
            try {
              const review = await callNvidia(
                "reason",
                [
                  { role: "system", content: "You are the validation stage of EgreedAI Engineering. Review the answer below strictly by reading it. Check: syntax errors, undefined/unimported symbols, wrong APIs, missing error handling, missing validation, security issues (injection, broken authorization, secret exposure), and whether every file the answer promises is actually complete. Reply with ONLY the word OK if there is nothing material to fix. Otherwise list the concrete defects, one per line, most severe first. Do not rewrite the code." },
                  { role: "user", content: answer.slice(0, 24000) },
                ],
                NVIDIA_KEY,
                { temperature: 0, maxTokens: 900 },
              );
              const issues = review.text.trim();
              const clean = /^ok\b/i.test(issues) || issues.length < 12;
              steps.push({
                label: "Validate",
                detail: clean ? "No material defects found on review." : issues.slice(0, 1200),
              });

              if (!clean) {
                const fixed = await callNvidia(
                  "code",
                  [
                    { role: "system", content: engineerSystem },
                    { role: "user", content: `Here is your previous answer:\n\n${answer.slice(0, 24000)}\n\n---\nA reviewer found these defects:\n${issues}\n\nReturn the corrected, complete answer. Keep everything that was right, fix every defect listed, keep all files complete and runnable. Do not mention the review or the reviewer.` },
                  ],
                  NVIDIA_KEY,
                  { temperature: 0.15, maxTokens: 7000 },
                );
                if (fixed.text.trim().length > 40) {
                  answer = fixed.text.trim();
                  steps.push({ label: "Fix", detail: "Defects corrected and answer regenerated." });
                }
              }
            } catch (e) {
              console.error("[egreed-ai] validate fail", (e as Error).message);
            }
          }
        } catch (e) {
          console.error("[egreed-ai] nvidia engineering failed:", (e as Error).message);
          answer = "";
        }
      }

      // Fallbacks keep engineering answers working even without NVIDIA.
      if (!answer) {
        const fbMessages = [{ role: "system", content: engineerSystem }, ...chatHistory];
        try {
          if (GEMINI_KEYS.length) { answer = await callGemini("gemini-3.8-flash", fbMessages, GEMINI_KEYS[0]); route = "gemini"; }
          else if (OPENAI_KEY) { answer = await callOpenAI("gpt-4o-mini", fbMessages, OPENAI_KEY); route = "openai"; }
        } catch (e) {
          console.error("[egreed-ai] engineering fallback failed:", (e as Error).message);
        }
      }

      console.log("[egreed-ai] engineering", JSON.stringify({
        taskKind, language, route, engineModel, stepCount: steps.length,
        kbInjected: knowledge.length > 0, preview: userText.slice(0, 80),
      }));

      if (!answer) {
        return new Response(JSON.stringify({ error: "No AI provider available for engineering work" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        answer: sanitize(answer),
        route,
        taskKind,
        playbook: pb.label,
        language,
        steps,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══════════════ EVERYDAY CHAT PATH — Africa-first persona ═══════════════
    const persona = det.isRw ? PERSONA_RW : PERSONA_EN;
    const rewriter = det.isRw ? REWRITER_RW : REWRITER_EN;
    const fullPersona = persona + personaExtras + knowledge;
    // Configured keys only (Gemini, then OpenAI). The workspace AI credit route is never used for chat.
    const route = GEMINI_KEYS.length ? "gemini" : OPENAI_KEY ? "openai" : "none";

    console.log("[egreed-ai] chat", JSON.stringify({
      confidence: det.confidence, isKinyarwanda: det.isRw, language, taskKind, route,
      kbInjected: knowledge.length > 0, preview: userText.slice(0, 80),
    }));

    if (route === "none") {
      return new Response(JSON.stringify({ error: "No AI provider configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const draftMessages = [{ role: "system", content: fullPersona }, ...messages];

    let draft = "";
    const tryGemini = async () => {
      let lastErr: unknown;
      for (const k of GEMINI_KEYS) {
        try { return await callGemini("gemini-3.8-flash", draftMessages, k); }
        catch (e) { lastErr = e; console.error("[egreed-ai] gemini key failed:", (e as Error).message); }
      }
      throw lastErr ?? new Error("no gemini keys");
    };
    try {
      draft = route === "gemini" ? await tryGemini() : await callOpenAI("gpt-4o-mini", draftMessages, OPENAI_KEY!);
    } catch (e) {
      const msg = (e as Error).message || "provider error";
      console.error(`[egreed-ai] ${route} failed:`, msg);
      return new Response(JSON.stringify({ error: `Your ${route === "gemini" ? "Gemini" : "OpenAI"} key(s) could not answer: ${msg.slice(0, 200)}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    draft = sanitize(draft);

    let final = draft;
    if (!/```/.test(draft)) {
      try {
        const rewritten = route === "gemini"
            ? await callGemini("gemini-3.8-flash", [
                { role: "system", content: fullPersona },
                { role: "user", content: `${rewriter}\n\n---DRAFT---\n${draft}` },
              ], GEMINI_KEYS[0])
            : "";
        if (rewritten && rewritten.trim().length > 10) final = rewritten;
      } catch (e) {
        console.error("[egreed-ai] rewrite skipped:", (e as Error).message);
      }
    }

    final = sanitize(final);

    return new Response(JSON.stringify({ success: true, answer: final, route, taskKind, language }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[egreed-ai] fatal", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message || "unexpected error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
