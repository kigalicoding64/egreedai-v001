import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import Index from './Index';

const scenario = vi.hoisted(() => ({ loadError: false }));
vi.mock('@/hooks/useKeyboardShortcuts', () => ({ useKeyboardShortcuts: () => {} }));
vi.mock('@/hooks/useChat', () => ({
  useChat: (onCreated: (id: string) => void, initial: string | null) => {
    const [active, selectConversation] = useState(initial);
    const conversations = ['chat-a', 'chat-b'].map(id => ({ id, messages: [{ content: id }] }));
    return {
      conversations, activeConversationId: active,
      activeConversation: conversations.find(c => c.id === active),
      selectConversation, loadingConversations: false,
      conversationLoadError: scenario.loadError, retryLoadConversations: vi.fn(),
      createNewChat: () => onCreated('chat-b'),
      deleteConversation: async () => true,
    };
  },
}));
vi.mock('@/components/chat/ChatArea', () => ({
  ChatArea: ({ messages }: { messages: { content: string }[] }) => <output data-testid="selection">{messages[0]?.content || 'home'}</output>,
}));
vi.mock('@/components/chat/ChatSidebar', () => ({
  ChatSidebar: ({ onSelectConversation, onNewChat, onDeleteConversation }: {
    onSelectConversation: (id: string) => void; onNewChat: () => void; onDeleteConversation: (id: string) => void;
  }) => <nav>
    <button onClick={() => onSelectConversation('chat-a')}>Open A</button>
    <button onClick={() => onSelectConversation('chat-b')}>Open B</button>
    <button onClick={onNewChat}>New chat</button>
    <button onClick={() => onDeleteConversation('chat-a')}>Delete A</button>
  </nav>,
}));

function HistoryControls() {
  const navigate = useNavigate();
  const location = useLocation();
  return <>
    <output data-testid="address">{location.pathname}</output>
    <button onClick={() => navigate(-1)}>Back</button>
    <button onClick={() => navigate(1)}>Forward</button>
    <button onClick={() => navigate('/')}>Home</button>
  </>;
}
function open(path: string) {
  render(<MemoryRouter initialEntries={[path]}><HistoryControls /><Routes>
    <Route path="/" element={<Index />} />
    <Route path="/chat/:chatId" element={<Index />} />
  </Routes></MemoryRouter>);
}
describe('chat addresses', () => {
  beforeEach(() => { scenario.loadError = false; localStorage.clear(); });
  it('refresh uses the chat address instead of a different remembered chat', () => {
    localStorage.setItem('egreed_active_chat', 'chat-b');
    open('/chat/chat-a');
    expect(screen.getByTestId('selection').textContent).toBe('chat-a');
    expect(screen.getByTestId('address').textContent).toBe('/chat/chat-a');
  });
  it('back and forward preserve the requested selection', async () => {
    open('/chat/chat-a');
    fireEvent.click(screen.getByText('Open B'));
    expect(screen.getByTestId('selection').textContent).toBe('chat-b');
    fireEvent.click(screen.getByText('Back'));
    await waitFor(() => expect(screen.getByTestId('selection').textContent).toBe('chat-a'));
    fireEvent.click(screen.getByText('Forward'));
    await waitFor(() => expect(screen.getByTestId('selection').textContent).toBe('chat-b'));
  });
  it('home clears the selected chat', () => {
    open('/chat/chat-a');
    fireEvent.click(screen.getByText('Home'));
    expect(screen.getByTestId('address').textContent).toBe('/');
    expect(screen.getByTestId('selection').textContent).toBe('home');
  });
  it('a newly created chat gets its own address', () => {
    open('/');
    fireEvent.click(screen.getByText('New chat'));
    expect(screen.getByTestId('address').textContent).toBe('/chat/chat-b');
  });
  it('deleting the selected chat returns home', async () => {
    open('/chat/chat-a');
    fireEvent.click(screen.getByText('Delete A'));
    await waitFor(() => expect(screen.getByTestId('address').textContent).toBe('/'));
  });
  it('missing chat recovery returns home', () => {
    open('/chat/missing');
    fireEvent.click(screen.getByRole('button', { name: 'Go home' }));
    expect(screen.getByTestId('selection').textContent).toBe('home');
  });
  it('loading failure is not treated as a missing chat', () => {
    scenario.loadError = true;
    open('/chat/chat-a');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Chat not found')).toBeNull();
    expect(screen.getByTestId('address').textContent).toBe('/chat/chat-a');
  });
});