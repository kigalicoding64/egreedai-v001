import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageSquareOff, RefreshCw } from 'lucide-react';
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
  const openChat = useCallback((id: string) => navigate(`/chat/${id}`), [navigate]);

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
    conversationLoadError,
    retryLoadConversations,
  } = useChat(openChat, chatId ?? null);

  // The address bar is the sole source of chat selection, including browser history.
  useEffect(() => {
    selectConversation(chatId ?? null);
  }, [chatId, selectConversation]);

  const notFound =
    !!chatId && !loadingConversations && !conversationLoadError && !conversations.some((c) => c.id === chatId);

  const handleDeleteConversation = async (id: string) => {
    const deleted = await deleteConversation(id);
    if (deleted && chatId === id) navigate('/', { replace: true });
  };

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
          onSelectConversation={openChat}
          onDeleteConversation={handleDeleteConversation}
          onSearchTrigger={(fn) => { searchTriggerRef.current = fn; }}
        />
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {conversationLoadError ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div role="alert" className="max-w-md text-center space-y-4">
            <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground">Couldn't load your chats</h1>
            <p className="text-sm text-muted-foreground">Check your connection and try again. Your chat address has not changed.</p>
            <Button onClick={retryLoadConversations}><RefreshCw className="h-4 w-4 mr-2" />Try again</Button>
          </div>
        </div>
      ) : notFound ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4 glass rounded-2xl p-8 border border-border">
            <MessageSquareOff className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-semibold text-foreground">Chat not found</h1>
            <p className="text-sm text-muted-foreground">
              This chat doesn't exist, was deleted, or belongs to another account.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={createNewChat}>
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
