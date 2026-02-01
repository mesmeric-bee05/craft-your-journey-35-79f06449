import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TypingUser {
  user_id: string;
  user_name: string;
  updated_at: string;
}

interface UseTypingIndicatorsProps {
  conversationId: string | null;
}

export function useTypingIndicators({ conversationId }: UseTypingIndicatorsProps) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastRef = useRef<number>(0);
  const isTypingRef = useRef(false);

  // Broadcast typing status
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!conversationId || !user) return;

    // Debounce broadcasts to every 2 seconds
    const now = Date.now();
    if (isTyping && now - lastBroadcastRef.current < 2000) {
      return;
    }

    try {
      if (isTyping) {
        lastBroadcastRef.current = now;
        isTypingRef.current = true;

        // Upsert typing indicator
        await supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: user.id,
            is_typing: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'conversation_id,user_id',
          });

        // Clear typing after 3 seconds of no activity
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      } else {
        isTypingRef.current = false;
        
        // Remove typing indicator
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error updating typing indicator:', error);
    }
  }, [conversationId, user]);

  // Clear typing when message is sent
  const clearTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setTyping(false);
  }, [setTyping]);

  // Subscribe to typing indicators for the conversation
  useEffect(() => {
    if (!conversationId || !user) {
      setTypingUsers([]);
      return;
    }

    // Fetch initial typing users
    const fetchTypingUsers = async () => {
      const { data } = await supabase
        .from('typing_indicators')
        .select('user_id, updated_at')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id);

      if (data) {
        // Filter out stale indicators (older than 5 seconds)
        const now = Date.now();
        const activeTypers = data.filter(t => {
          const updatedAt = new Date(t.updated_at).getTime();
          return now - updatedAt < 5000;
        });

        // Get user names
        if (activeTypers.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', activeTypers.map(t => t.user_id));

          const typingWithNames = activeTypers.map(t => ({
            user_id: t.user_id,
            user_name: profiles?.find(p => p.user_id === t.user_id)?.full_name || 'Someone',
            updated_at: t.updated_at,
          }));

          setTypingUsers(typingWithNames);
        } else {
          setTypingUsers([]);
        }
      }
    };

    fetchTypingUsers();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { user_id: string };
            if (deleted.user_id !== user.id) {
              setTypingUsers(prev => prev.filter(t => t.user_id !== deleted.user_id));
            }
          } else if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as { user_id: string; is_typing: boolean; updated_at: string };
            if (record.user_id !== user.id && record.is_typing) {
              // Get user name
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', record.user_id)
                .single();

              setTypingUsers(prev => {
                const filtered = prev.filter(t => t.user_id !== record.user_id);
                return [...filtered, {
                  user_id: record.user_id,
                  user_name: profile?.full_name || 'Someone',
                  updated_at: record.updated_at,
                }];
              });

              // Auto-remove after 5 seconds if no update
              setTimeout(() => {
                setTypingUsers(prev => prev.filter(t => t.user_id !== record.user_id));
              }, 5000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Clean up our own typing indicator when unmounting
      if (isTypingRef.current) {
        supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);
      }
    };
  }, [conversationId, user]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    setTyping,
    clearTyping,
    isTyping: typingUsers.length > 0,
  };
}
