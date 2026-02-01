import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface LiveChatMessage {
  id: string;
  stream_id: string;
  user_id: string | null;
  user_name: string;
  message: string;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
}

interface UseLiveChatMessagesProps {
  streamId: string | null;
  isStreaming: boolean;
}

export function useLiveChatMessages({ streamId, isStreaming }: UseLiveChatMessagesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<LiveChatMessage | null>(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!streamId) {
      setMessages([]);
      setPinnedMessage(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(200);

      if (error) throw error;

      const typedMessages = (data || []) as LiveChatMessage[];
      setMessages(typedMessages);
      
      // Find pinned message
      const pinned = typedMessages.find(m => m.is_pinned);
      setPinnedMessage(pinned || null);
    } catch (error: any) {
      console.error('Error fetching chat messages:', error);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    if (isStreaming && streamId) {
      fetchMessages();
    } else {
      setMessages([]);
      setPinnedMessage(null);
    }
  }, [fetchMessages, isStreaming, streamId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!streamId || !isStreaming) return;

    const channel = supabase
      .channel(`live-chat-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const newMessage = payload.new as LiveChatMessage;
          setMessages(prev => [...prev.slice(-199), newMessage]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          const updated = payload.new as LiveChatMessage;
          
          if (updated.is_deleted) {
            setMessages(prev => prev.filter(m => m.id !== updated.id));
          } else {
            setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
          }

          // Update pinned message
          if (updated.is_pinned) {
            setPinnedMessage(updated);
          } else if (pinnedMessage?.id === updated.id) {
            setPinnedMessage(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, isStreaming, pinnedMessage?.id]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!streamId || !user || !content.trim()) return;

    try {
      const { error } = await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          user_id: user.id,
          user_name: user.email?.split('@')[0] || 'Anonymous',
          message: content.trim(),
        });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [streamId, user, toast]);

  // Pin message
  const pinMessage = useCallback(async (messageId: string) => {
    if (!streamId) return;

    try {
      // Unpin all messages first
      await supabase
        .from('live_chat_messages')
        .update({ is_pinned: false })
        .eq('stream_id', streamId)
        .eq('is_pinned', true);

      // Pin the new message
      const { error } = await supabase
        .from('live_chat_messages')
        .update({ is_pinned: true })
        .eq('id', messageId);

      if (error) throw error;

      toast({ title: 'Message pinned' });
    } catch (error: any) {
      toast({
        title: 'Failed to pin message',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [streamId, toast]);

  // Unpin message
  const unpinMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('live_chat_messages')
        .update({ is_pinned: false })
        .eq('id', messageId);

      if (error) throw error;

      setPinnedMessage(null);
      toast({ title: 'Message unpinned' });
    } catch (error: any) {
      toast({
        title: 'Failed to unpin message',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Delete message (moderation)
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('live_chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast({ title: 'Message deleted' });
    } catch (error: any) {
      toast({
        title: 'Failed to delete message',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    messages,
    loading,
    pinnedMessage,
    sendMessage,
    pinMessage,
    unpinMessage,
    deleteMessage,
    refetch: fetchMessages,
  };
}
