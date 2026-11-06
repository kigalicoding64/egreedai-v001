import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppBuilder from './AppBuilder';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

async function settle(ms = 0) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

describe('App Builder request boundaries', () => {
  beforeEach(() => {
    invoke.mockReset();
    vi.useRealTimers();
  });

  it('shows a provider rate limit and stops without retrying the failed file request', async () => {
    vi.useFakeTimers();
    invoke.mockResolvedValueOnce({ data: { plan: { name: 'demo', summary: 'Demo', files: [{ path: 'src/main.ts' }] } }, error: null });
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: 'The configured provider is rate limiting requests. Please wait before sending a new message.' }), { status: 429 }) } });
    render(<MemoryRouter><AppBuilder /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Describe the app/), { target: { value: 'Build a task manager' } });
    fireEvent.click(screen.getByRole('button', { name: /^Build$/ }));
    await settle();
    await settle(12_000);
    expect(screen.getByRole('alert')).toHaveTextContent('The configured provider is rate limiting requests.');
    expect(invoke).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('pauses between new stage requests without repeating any request', async () => {
    invoke.mockImplementation(async (_name: string, options: { body: { stage: string; targets?: { path: string }[] } }) => {
      const { stage, targets } = options.body;
      if (stage === 'plan') return { data: { plan: { name: 'demo', summary: 'Demo', files: [{ path: 'src/a.ts' }, { path: 'src/b.ts' }] } }, error: null };
      if (stage === 'files') return { data: { files: [{ path: targets![0].path, content: 'export const value = 1;' }] }, error: null };
      return { data: { ok: true, issues: [] }, error: null };
    });
    render(<MemoryRouter><AppBuilder /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Describe the app/), { target: { value: 'Build a task manager' } });
    fireEvent.click(screen.getByRole('button', { name: /^Build$/ }));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(2), { timeout: 14_000 });
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(3), { timeout: 14_000 });
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(4), { timeout: 14_000 });
    expect(invoke.mock.calls.map(([, options]) => options.body.stage)).toEqual(['plan', 'files', 'files', 'validate']);
  }, 45_000);

  it('shows the safe denial and stops without retrying a failed file request', async () => {
    vi.useFakeTimers();
    invoke.mockResolvedValueOnce({ data: { plan: { name: 'demo', summary: 'Demo', files: [{ path: 'src/main.ts' }] } }, error: null });
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: 'The configured provider denied access. No other provider was used.' }), { status: 403 }) } });
    render(<MemoryRouter><AppBuilder /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Describe the app/), { target: { value: 'Build a task manager' } });
    fireEvent.click(screen.getByRole('button', { name: /^Build$/ }));
    await settle();
    await settle(12_000);
    expect(screen.getByRole('alert')).toHaveTextContent('The configured provider denied access. No other provider was used.');
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /^Build$/ })).not.toBeDisabled();
    vi.useRealTimers();
  });
});
