import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, Conversation } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';
import { formatSearchResults } from '@/utils/webSearchDetection';

const generateId = () => Math.random().toString(36).substring(2, 15);

const generateTitle = (content: string) => {
  return content.length > 40 ? content.substring(0, 40) + '...' : content;
};

const WEB_SEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/web-search`;
const EGREED_AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/egreed-ai`;

export function useChat(onConversationCreated?: (id: string) => void, initialChatId: string | null = null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialChatId);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [modelId, setModelId] = useState<string>(() =>
    localStorage.getItem('egreed_model') || 'egreed-fast'
  );
  const [useKnowledge, setUseKnowledge] = useState<boolean>(() =>
    localStorage.getItem('egreed_use_kb') === '1'
  );
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [conversationLoadError, setConversationLoadError] = useState(false);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectModel = useCallback((id: string) => {
    setModelId(id);
    localStorage.setItem('egreed_model', id);
  }, []);
  const toggleKnowledge = useCallback(() => {
    setUseKnowledge((v) => {
      const n = !v;
      localStorage.setItem('egreed_use_kb', n ? '1' : '0');
      return n;
    });
  }, []);

  // Perform web search
  const performWebSearch = async (query: string, language: string = 'en'): Promise<string | null> => {
    try {
      setIsSearching(true);
      const response = await fetch(WEB_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ query, language }),
      });

      if (!response.ok) {
        console.error('Web search failed');
        return null;
      }

      const data = await response.json();
      if (data.success && data.answer) {
        return formatSearchResults(data.answer, data.sources || []);
      }
      return null;
    } catch (error) {
      console.error('Web search error:', error);
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  // Load conversations once auth has settled (never wipe while the session is restoring)
  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated && user) {
      loadConversations();
    } else {
      setConversations([]);
      setActiveConversationId(null);
      setLoadingConversations(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user?.id]);

  const loadConversations = async () => {
    if (!user) return;
    setLoadingConversations(true);
    setConversationLoadError(false);
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('*, messages(*)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    setLoadingConversations(false);

    if (convError) {
      setConversationLoadError(true);
      console.error('Error loading conversations:', convError);
      toast({ title: "Couldn't load your chats", description: 'Check your connection and refresh the page.', variant: 'destructive' });
      return;
    }

    const conversationsWithMessages: Conversation[] = (convData || []).map((conv: any) => ({
      id: conv.id,
      title: conv.title,
      messages: [...(conv.messages || [])]
        .sort((a: any, b: any) => a.created_at.localeCompare(b.created_at))
        .map((msg: any) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          imageUrl: msg.image_url || undefined,
        })),
      createdAt: new Date(conv.created_at),
      updatedAt: new Date(conv.updated_at),
      userId: conv.user_id,
    }));

    setConversations(conversationsWithMessages);
  };

  const createNewChat = useCallback(async () => {
    const newConversation: Conversation = {
      id: generateId(),
      title: 'New conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isAuthenticated && user) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: newConversation.title
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        toast({ title: "Couldn't create your chat", description: 'Please try again.', variant: 'destructive' });
        return;
      } else if (data) {
        newConversation.id = data.id;
      }
    }

    setConversations((prev) => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
    onConversationCreated?.(newConversation.id);
  }, [isAuthenticated, user, toast, onConversationCreated]);

  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    if (isAuthenticated && user) {
      const { error } = await supabase.from('conversations').delete().eq('id', id);
      if (error) {
        toast({ title: "Couldn't delete your chat", description: 'Please try again.', variant: 'destructive' });
        return false;
      }
    }
    
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
    return true;
  }, [activeConversationId, isAuthenticated, user, toast]);

  const sendMessage = useCallback(
    async (content: string, imageUrl?: string) => {
      let conversationId = activeConversationId;

      // Create new conversation if none exists
      if (!conversationId) {
        const newConversation: Conversation = {
          id: generateId(),
          title: generateTitle(content),
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        if (isAuthenticated && user) {
          const { data, error } = await supabase
            .from('conversations')
            .insert({
              user_id: user.id,
              title: newConversation.title
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating conversation:', error);
            toast({ title: "Couldn't save your chat", description: 'Please try again.', variant: 'destructive' });
            return;
          } else if (data) {
            newConversation.id = data.id;
          }
        }

        setConversations((prev) => [newConversation, ...prev]);
        conversationId = newConversation.id;
        setActiveConversationId(conversationId);
        onConversationCreated?.(conversationId);
      }

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date(),
        imageUrl
      };

      // Save user message to database
      if (isAuthenticated && user) {
        await supabase.from('messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content,
          image_url: imageUrl
        });

        // Update conversation title if first message
        const conv = conversations.find(c => c.id === conversationId);
        if (conv && conv.messages.length === 0) {
          await supabase
            .from('conversations')
            .update({ title: generateTitle(content) })
            .eq('id', conversationId);
        }
      }

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            const updatedMessages = [...c.messages, userMessage];
            return {
              ...c,
              messages: updatedMessages,
              title: c.messages.length === 0 ? generateTitle(content) : c.title,
              updatedAt: new Date(),
            };
          }
          return c;
        })
      );

      // Get conversation messages for context
      const currentConv = conversations.find(c => c.id === conversationId);
      const messagesForApi = [
        ...(currentConv?.messages || []).map(m => ({
          role: m.role,
          content: m.content
        })),
        { role: 'user' as const, content }
      ];

      // LLAMA DISABLED — search-first mode. Always try web search; fall back to a friendly canned reply.
      setIsLoading(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      let assistantContent = '';
      const aiMessageId = generateId();

      setConversations((prev) =>
        prev.map((c) => c.id === conversationId
          ? { ...c, messages: [...c.messages, { id: aiMessageId, role: 'assistant' as const, content: '', timestamp: new Date() }], updatedAt: new Date() }
          : c)
      );

      const updateLast = (text: string) => {
        setConversations((prev) =>
          prev.map((c) => c.id === conversationId
            ? { ...c, messages: c.messages.map((m, i) => i === c.messages.length - 1 ? { ...m, content: text } : m), updatedAt: new Date() }
            : c)
        );
      };

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(EGREED_AI_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: messagesForApi, useKnowledge }),
          signal: controller.signal,
        });

        let failed = false;
        if (res.status === 429) {
          failed = true;
          assistantContent = "I'm getting a lot of questions right now. Please try again in a moment.";
        } else if (res.status === 402) {
          failed = true;
          assistantContent = "The AI credits for this workspace have run out. Please top up to keep chatting.";
        } else if (!res.ok) {
          failed = true;
          const err = await res.json().catch(() => null);
          const raw = String(err?.error || '');
          if (res.status === 502 && /key|gemini|openai|denied|401|403/i.test(raw)) {
            assistantContent = "⚠️ **I can't reply right now.** The AI keys connected to EgreedAI were refused by their providers. An admin needs to replace them in **Admin → Gemini keys**. Your chat is saved — try again once the keys are fixed.";
          } else {
            assistantContent = `⚠️ **Something went wrong** (error ${res.status}). Your chat is saved — please try again in a moment.`;
          }
          console.error('Chat reply failed:', raw);
        } else {
          const data = await res.json();
          assistantContent = String(data?.answer || '').replace(/\n{3,}/g, '\n\n').trim();
          if (!assistantContent) { failed = true; assistantContent = "I didn't get an answer back. Please try again."; }
        }

        updateLast(assistantContent);

        if (!failed && isAuthenticated && user) {
          const { error: saveErr } = await supabase.from('messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: assistantContent
          });
          if (saveErr) console.error('Error saving reply:', saveErr);
          await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          updateLast(assistantContent || '_Stopped._');
        } else {
          console.error('Error generating response:', error);
          updateLast("I couldn't reach the server. Check your connection and try again.");
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [activeConversationId, conversations, isAuthenticated, user, toast, modelId, useKnowledge, onConversationCreated]
  );

  const generateImage = useCallback(async (prompt: string) => {
    let conversationId = activeConversationId;

    // Create new conversation if none exists
    if (!conversationId) {
      const newConversation: Conversation = {
        id: generateId(),
        title: `Image: ${prompt.substring(0, 30)}...`,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (isAuthenticated && user) {
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            title: newConversation.title
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating conversation:', error);
          toast({ title: "Couldn't save your chat", description: 'Please try again.', variant: 'destructive' });
          return;
        } else if (data) {
          newConversation.id = data.id;
        }
      }

      setConversations((prev) => [newConversation, ...prev]);
      conversationId = newConversation.id;
      setActiveConversationId(conversationId);
      onConversationCreated?.(conversationId);
    }

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: `🎨 Generate image: ${prompt}`,
      timestamp: new Date(),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === conversationId) {
          return {
            ...c,
            messages: [...c.messages, userMessage],
            updatedAt: new Date(),
          };
        }
        return c;
      })
    );

    setIsLoading(true);

    try {
      // Image generation is disabled since Lovable AI was disconnected
      const aiMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: 'Image generation is currently disabled. Connect your Llama Stack server to enable media generation.',
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === conversationId) {
            return {
              ...c,
              messages: [...c.messages, aiMessage],
              updatedAt: new Date(),
            };
          }
          return c;
        })
      );

      // Save messages to database
      if (isAuthenticated && user) {
        await supabase.from('messages').insert([
          {
            conversation_id: conversationId,
            role: 'user',
            content: userMessage.content
          },
          {
            conversation_id: conversationId,
            role: 'assistant',
            content: aiMessage.content
          }
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Image generation failed",
        description: (error as Error).message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [activeConversationId, isAuthenticated, user, toast, onConversationCreated]);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to upload files",
        variant: "destructive"
      });
      return null;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${generateId()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-uploads')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: (error as Error).message,
        variant: "destructive"
      });
      return null;
    }
  }, [isAuthenticated, user, toast]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  }, []);

  return {
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
    performWebSearch,
    modelId,
    loadingConversations,
    conversationLoadError,
    retryLoadConversations: loadConversations,
    selectModel,
    useKnowledge,
    toggleKnowledge,
  };
}
