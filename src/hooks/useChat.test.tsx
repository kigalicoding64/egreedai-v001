import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from './useChat';

const state = vi.hoisted(() => ({ failUser: false, failAssistant: false, saved: [] as { role: string; content: string }[], toast: vi.fn() }));
vi.mock('./useAuth', () => ({ useAuth: () => ({ user: { id: 'owner' }, isAuthenticated: true, loading: false }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { access_token: 'test-only' } } }) },
  from: (table: string) => ({
    select: () => ({ eq: () => ({ order: async () => ({ data: [{ id: 'chat-a', title: 'Chat', messages: [], created_at: '2026-01-01', updated_at: '2026-01-01' }] }) }) }),
    insert: async (row: { role: string; content: string }) => {
      const failed = row.role === 'user' ? state.failUser : state.failAssistant;
      if (table === 'messages' && !failed) state.saved.push(row);
      return { error: failed ? { message: 'offline' } : null };
    },
    update: () => ({ eq: async () => ({ error: null }) }),
  }),
} }));

async function open() {
  const hook = renderHook(() => useChat(undefined, 'chat-a'));
  await waitFor(() => expect(hook.result.current.loadingConversations).toBe(false));
  return hook;
}
describe('saved chat replies', () => {
  beforeEach(() => { state.saved = []; state.failUser = false; state.failAssistant = false; state.toast.mockClear(); vi.restoreAllMocks(); });
  it('keeps the user saved and excludes provider failures from the next request context', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Access blocked' }), { status: 403 }));
    const hook = await open();
    await act(() => hook.result.current.sendMessage('First question'));
    expect(state.saved).toEqual([expect.objectContaining({ role: 'user', content: 'First question' })]);
    await act(() => hook.result.current.sendMessage('Second question'));
    const payload = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
    expect(payload.messages).toEqual([{ role: 'user', content: 'First question' }, { role: 'user', content: 'Second question' }]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('does not send an AI request when saving the user fails', async () => {
    state.failUser = true;
    const fetcher = vi.spyOn(globalThis, 'fetch');
    const hook = await open();
    await act(() => hook.result.current.sendMessage('Save me'));
    expect(fetcher).not.toHaveBeenCalled();
    expect(state.saved).toHaveLength(0);
    expect(hook.result.current.isLoading).toBe(false);
  });
  it('saves a complete successful reply', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ answer: 'A complete answer.' })));
    const hook = await open();
    await act(() => hook.result.current.sendMessage('Hello'));
    expect(state.saved.map(m => m.role)).toEqual(['user', 'assistant']);
    expect(state.saved[1].content).toBe('A complete answer.');
  });
  it('warns when a completed reply cannot be saved', async () => {
    state.failAssistant = true;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ answer: 'Keep this answer.' })));
    const hook = await open();
    await act(() => hook.result.current.sendMessage('Hello'));
    expect(state.saved.map(m => m.role)).toEqual(['user']);
    expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't save the reply" }));
  });
  it('blocks overlapping sends before saving or requesting twice', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ answer: 'Answer' })));
    const hook = await open();
    await act(async () => { await Promise.all([hook.result.current.sendMessage('One'), hook.result.current.sendMessage('Two')]); });
    expect(state.saved.filter(m => m.role === 'user')).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});