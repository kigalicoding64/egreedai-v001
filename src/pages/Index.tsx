import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquareOff } from 'lucide-react';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { Button } from '@/components/ui/button';
import { useChat } from '@/hooks/useChat';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { Language, SUPPORTED_LANGUAGES } from '@/components/chat/LanguageSelector';

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const searchTriggerRef = useRef<(() => void) | null>(null);
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();

  const {
    conversations,
    activeConversation,
    activeConversationId,
    isLoading,
    isSearching,
    createNewChat,
    selectConversation,
    deleteConversation,
    sendMessage,
    generateImage,
    uploadFile,
    stopGeneration,
    modelId,
    selectModel,
    useKnowledge,
    toggleKnowledge,
    loadingConversations,
  } = useChat();

  // URL -> state: open the chat named in the address bar.
  const lastParam = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (chatId === lastParam.current) return;
    lastParam.current = chatId;
    if (chatId && chatId !== activeConversationId) selectConversation(chatId);
  }, [chatId, activeConversationId, selectConversation]);

  // State -> URL: keep the address bar in sync with the open chat.
  const lastActive = useRef<string | null>(null);
  useEffect(() => {
    if (activeConversationId === lastActive.current) return;
    lastActive.current = activeConversationId;
    const target = activeConversationId ? `/chat/${activeConversationId}` : '/';
    if (activeConversationId !== (chatId ?? null)) {
      lastParam.current = activeConversationId ?? undefined;
      navigate(target, { replace: !chatId });
    }
  }, [activeConversationId, chatId, navigate]);

  const notFound =
    !!chatId && !loadingConversations && !conversations.some((c) => c.id === chatId);

  useKeyboardShortcuts({
    onNewChat: createNewChat,
    onSearch: useCallback(() => searchTriggerRef.current?.(), []),
    onToggleVoice: useCallback(() => setVoiceModeActive(v => !v), []),
    onToggleSidebar: useCallback(() => setSidebarOpen(v => !v), []),
  });

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-background gradient-bg">
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:relative lg:z-0 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:hidden"
        )}
      >
        <ChatSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onNewChat={createNewChat}
          onSelectConversation={selectConversation}
          onDeleteConversation={deleteConversation}
          onSearchTrigger={(fn) => { searchTriggerRef.current = fn; }}
        />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {notFound ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4 glass rounded-2xl p-8 border border-border">
            <MessageSquareOff className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground">Chat not found</h1>
            <p className="text-sm text-muted-foreground">
              This chat doesn't exist, was deleted, or belongs to another account.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { lastParam.current = undefined; navigate('/'); createNewChat(); }}>
                Start a new chat
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>Go home</Button>
            </div>
          </div>
        </div>
      ) : (
        <ChatArea
          messages={activeConversation?.messages || []}
          isLoading={isLoading}
          isSearching={isSearching}
          onSendMessage={sendMessage}
          onGenerateImage={generateImage}
          onFileUpload={uploadFile}
          onStop={stopGeneration}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          voiceModeActive={voiceModeActive}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          modelId={modelId}
          onSelectModel={selectModel}
          useKnowledge={useKnowledge}
          onToggleKnowledge={toggleKnowledge}
          loadingConversations={loadingConversations}
        />
      )}
    </div>
  );
};

export default Index;
