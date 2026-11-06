import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AppBuilder from './AppBuilder';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

describe('App Builder terminal errors', () => {
  beforeEach(() => invoke.mockReset());
  it('shows a provider rate limit and stops without retrying the failed file request', async () => {
    invoke.mockResolvedValueOnce({ data: { plan: { name: 'demo', summary: 'Demo', files: [{ path: 'src/main.ts' }] } }, error: null });
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: 'The configured provider is rate limiting requests. Please wait before sending a new message.' }), { status: 429 }) } });
    render(<MemoryRouter><AppBuilder /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Describe the app/), { target: { value: 'Build a task manager' } });
    fireEvent.click(screen.getByRole('button', { name: /^Build$/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The configured provider is rate limiting requests.'));
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('pauses between new stage requests without repeating any request', async () => {
    vi.useFakeTimers();
    try {
      invoke.mockImplementation(async ({ stage }: { stage: string }) => {
        if (stage === 'plan') return { data: { plan: { name: 'demo', summary: 'Demo', files: [{ path: 'src/a.ts' }, { path: 'src/b.ts' }] } }, error: null };
        if (stage === 'files') return { data: { files: [{ path: 'src/a.ts', content: 'export const a = 1;' }] }, error: null };
        return { data: { ok: true, issues: [] }, error: null };
      });
      render(<MemoryRouter><AppBuilder /></MemoryRouter>);
      fireEvent.change(screen.getByPlaceholderText(/Describe the app/), { target: { value: 'Build a task manager' } });
      fireEvent.click(screen.getByRole('button', { name: /^Build$/ }));
      await vi.advanceTimersByTimeAsync(0);
      expect(invoke).toHaveBeenCalledTimes(2);
      expect(invoke.mock.calls.map(([body]) => body.stage)).toEqual(['plan', 'files']);

      await vi.advanceTimersByTimeAsync(12_000);
      expect(invoke).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(12_000);
      expect(invoke).toHaveBeenCalledTimes(4);
      expect(invoke.mock.calls.map(([body]) => body.stage)).toEqual(['plan', 'files', 'files', 'validate']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the safe denial and stops without retrying a failed file request', async () => {
    invoke.mockResolvedValueOnce({ data: { plan: { name: 'demo', summary: 'Demo', files: [{ path: 'src/main.ts' }] } }, error: null });
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: 'The configured provider denied access. No other provider was used.' }), { status: 403 }) } });
    render(<MemoryRouter><AppBuilder /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Describe the app/), { target: { value: 'Build a task manager' } });
    fireEvent.click(screen.getByRole('button', { name: /^Build$/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The configured provider denied access. No other provider was used.'));
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /^Build$/ })).not.toBeDisabled();
  });
});