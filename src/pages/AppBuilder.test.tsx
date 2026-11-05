import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AppBuilder from './AppBuilder';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke } } }));

describe('App Builder terminal errors', () => {
  beforeEach(() => invoke.mockReset());
  it('shows the safe denial and stops without retrying a failed file request', async () => {
    invoke.mockResolvedValueOnce({ data: { plan: { name: 'demo', summary: 'Demo', files: [{ path: 'src/main.ts' }] } }, error: null });
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: 'The configured provider denied access. No other provider was used.' }), { status: 403 }) } });
    render(<MemoryRouter><AppBuilder /></MemoryRouter>);
    fireEvent.change(screen.getByPlaceholderText(/Describe the app/), { target: { value: 'Build a task manager' } });
    fireEvent.click(screen.getByRole('button', { name: 'Build', exact: true }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('The configured provider denied access. No other provider was used.'));
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Build', exact: true })).not.toBeDisabled();
  });
});