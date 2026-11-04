export type Provider = 'gemini' | 'openai';
export class ProviderError extends Error {
  constructor(public status: number, message: string, public denied = false) {
    super(message);
  }
}

export function selectProvider(geminiKeys: string[], openaiKey?: string): { provider: Provider; key: string } {
  if (geminiKeys[0]) return { provider: 'gemini', key: geminiKeys[0] };
  if (openaiKey) return { provider: 'openai', key: openaiKey };
  throw new ProviderError(503, 'No AI provider key is configured. An admin must configure a working key.');
}

export async function requestReply(
  provider: Provider, key: string, messages: { role: string; content: string }[], signal: AbortSignal,
  request: typeof fetch = fetch, maxTokens = 4096,
): Promise<string> {
  const gemini = provider === 'gemini';
  const url = gemini
    ? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    : 'https://api.openai.com/v1/chat/completions';
  const body = gemini ? {
    system_instruction: { parts: messages.filter(m => m.role === 'system').map(m => ({ text: m.content })) },
    contents: messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }],
    })),
  generationConfig: { maxOutputTokens: maxTokens },
  } : { model: 'gpt-4o-mini', messages, max_tokens: maxTokens };
  const response = await request(url, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', ...(gemini ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` }) },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Do not expose provider payloads: they can contain masked or literal credentials.
    const reason = String(data?.error?.message ?? '');
    const denied = response.status === 403;
    const message = denied
      ? /project has been denied access/i.test(reason)
        ? 'The configured AI project is blocked. An admin must restore its access before chat can resume.'
        : 'The configured provider denied access. An admin must restore access before chat can resume.'
      : response.status === 401 ? 'The configured provider rejected its API key. An admin must replace it.'
      : response.status === 429 ? 'The configured provider is rate limiting requests. Please wait before sending a new message.'
      : response.status === 404 ? 'The configured AI model or endpoint is unavailable. An admin must check its availability.'
      : response.status === 400 ? 'The configured provider rejected the request. An admin must check the model configuration.'
      : 'The configured provider could not complete the reply. No other provider was used.';
    throw new ProviderError(response.status, message, denied);
  }
  if (data?.promptFeedback?.blockReason || data?.choices?.[0]?.message?.refusal ||
      ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT'].includes(data?.candidates?.[0]?.finishReason)) {
    throw new ProviderError(422, 'The configured provider declined this request.');
  }
  const finish = gemini ? data?.candidates?.[0]?.finishReason : data?.choices?.[0]?.finish_reason;
  if (finish === 'MAX_TOKENS' || finish === 'length') throw new ProviderError(422, 'The reply exceeded the output limit. Please ask a smaller question.');
  const answer = gemini
    ? (data?.candidates?.[0]?.content?.parts ?? []).filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('')
    : data?.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer.trim()) throw new ProviderError(422, 'The configured provider returned no reply.');
  return answer.trim();
}