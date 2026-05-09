import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'system' | 'bot';
  sender_id: string | null;
  content: string | null;
  content_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'template';
  attachments: any[];
  metadata: Record<string, any>;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  is_internal: boolean;
  created_at: string;
}

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, isInternal?: boolean) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useMessages(conversationId: string | null): UseMessagesReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setMessages(data as unknown as Message[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);

          // Fire-and-forget VoC sentiment analysis for inbound customer messages
          if (newMessage.sender_type === 'customer' && newMessage.content && newMessage.content.length >= 3) {
            try {
              const { data: conv } = await supabase
                .from('conversations')
                .select('business_id, customer_id')
                .eq('id', newMessage.conversation_id)
                .maybeSingle();
              if (conv?.business_id) {
                supabase.functions.invoke('analyze-customer-sentiment', {
                  body: {
                    business_id: conv.business_id,
                    text: newMessage.content,
                    source: 'inbox',
                    conversation_id: newMessage.conversation_id,
                    message_id: newMessage.id,
                    customer_id: conv.customer_id ?? undefined,
                  },
                }).catch(() => {});
              }
            } catch { /* swallow */ }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async (content: string, isInternal = false) => {
    if (!conversationId || !user || !content.trim()) return;

    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: user.id,
        content: content.trim(),
        content_type: 'text',
        is_internal: isInternal,
        status: 'sent',
      } as any);

      if (error) throw error;

      // Update conversation's last message
      await supabase
        .from('conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content.trim().substring(0, 100),
        })
        .eq('id', conversationId);

    } catch (err: any) {
      toast({ title: 'Failed to send message', description: err.message, variant: 'destructive' });
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
  };
}
