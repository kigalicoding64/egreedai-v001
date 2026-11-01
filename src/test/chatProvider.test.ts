import { describe, expect, it, vi } from 'vitest';
import { ProviderError, requestReply, selectProvider } from '../../supabase/functions/egreed-ai/provider';

describe('configured provider only', () => {
  it('selects one configured key and never switches on rejection', async () => {
    const selected = selectProvider(['configured-one', 'configured-two'], 'other-provider');
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'secret-key-material' } }), { status: 403 }));
    await expect(requestReply(selected.provider, selected.key, [{ role: 'user', content: 'Hi' }], new AbortController().signal, request)).rejects.toMatchObject({ status: 403, denied: true });
    expect(selected).toEqual({ provider: 'gemini', key: 'configured-one' });
    expect(request).toHaveBeenCalledTimes(1);
    expect(String(request.mock.calls[0][0])).not.toContain('lovable');
  });
  it('uses OpenAI only when Gemini was not configured', () => {
    expect(selectProvider([], 'configured')).toEqual({ provider: 'openai', key: 'configured' });
    expect(() => selectProvider([])).toThrow(ProviderError);
  });
  it('returns complete content and passes cancellation to the one request', async () => {
    const signal = new AbortController().signal;
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'Complete answer.' }] } }] })));
    await expect(requestReply('gemini', 'configured', [{ role: 'user', content: 'Hi' }], signal, request)).resolves.toBe('Complete answer.');
    expect(request.mock.calls[0][1]?.signal).toBe(signal);
  });
  it('does not treat a truncated answer as complete', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: 'Partial' } }] })));
    await expect(requestReply('openai', 'configured', [], new AbortController().signal, request)).rejects.toMatchObject({ status: 422 });
  });
  it('never exposes rejected key payloads', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'private-key-content' } }), { status: 401 }));
    const outcome = await requestReply('openai', 'configured', [], new AbortController().signal, request).catch(error => error);
    expect(outcome).toBeInstanceOf(ProviderError);
    expect(outcome.message).not.toContain('private-key-content');
    expect(outcome).toMatchObject({ status: 401 });
  });
});