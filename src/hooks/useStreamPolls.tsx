import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface PollOption {
  id: string;
  text: string;
}

export interface StreamPoll {
  id: string;
  stream_id: string;
  question: string;
  options: PollOption[];
  votes: Record<string, string[]>; // option_id -> user_ids
  is_active: boolean;
  ends_at: string | null;
  created_at: string;
}

interface UseStreamPollsProps {
  streamId: string | null;
}

export function useStreamPolls({ streamId }: UseStreamPollsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [polls, setPolls] = useState<StreamPoll[]>([]);
  const [activePoll, setActivePoll] = useState<StreamPoll | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch polls
  const fetchPolls = useCallback(async () => {
    if (!streamId) {
      setPolls([]);
      setActivePoll(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stream_polls')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedPolls = (data || []).map(p => ({
        ...p,
        options: p.options as unknown as PollOption[],
        votes: (p.votes || {}) as unknown as Record<string, string[]>,
      })) as StreamPoll[];

      setPolls(typedPolls);
      
      // Find active poll
      const active = typedPolls.find(p => p.is_active);
      setActivePoll(active || null);
    } catch (error: any) {
      console.error('Error fetching polls:', error);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`polls-${streamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_polls',
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newPoll = {
              ...payload.new,
              options: payload.new.options as unknown as PollOption[],
              votes: (payload.new.votes || {}) as unknown as Record<string, string[]>,
            } as StreamPoll;
            
            setPolls(prev => [newPoll, ...prev]);
            if (newPoll.is_active) {
              setActivePoll(newPoll);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = {
              ...payload.new,
              options: payload.new.options as unknown as PollOption[],
              votes: (payload.new.votes || {}) as unknown as Record<string, string[]>,
            } as StreamPoll;
            
            setPolls(prev => prev.map(p => p.id === updated.id ? updated : p));
            
            if (updated.is_active) {
              setActivePoll(updated);
            } else if (activePoll?.id === updated.id) {
              setActivePoll(null);
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setPolls(prev => prev.filter(p => p.id !== deleted.id));
            if (activePoll?.id === deleted.id) {
              setActivePoll(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId, activePoll?.id]);

  // Create poll
  const createPoll = useCallback(async (question: string, optionTexts: string[], durationMinutes?: number) => {
    if (!streamId) return null;

    try {
      const options: PollOption[] = optionTexts.map((text, index) => ({
        id: `opt_${index}_${Date.now()}`,
        text,
      }));

      const pollData: any = {
        stream_id: streamId,
        question,
        options,
        votes: {},
        is_active: true,
      };

      if (durationMinutes) {
        pollData.ends_at = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      }

      // Deactivate other polls first
      await supabase
        .from('stream_polls')
        .update({ is_active: false })
        .eq('stream_id', streamId)
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('stream_polls')
        .insert(pollData)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Poll created!' });
      return data;
    } catch (error: any) {
      toast({
        title: 'Failed to create poll',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [streamId, toast]);

  // Vote on poll
  const vote = useCallback(async (pollId: string, optionId: string) => {
    if (!user) return;

    try {
      // Get current poll
      const poll = polls.find(p => p.id === pollId);
      if (!poll) return;

      // Check if user already voted
      const hasVoted = Object.values(poll.votes).some(voters => 
        voters.includes(user.id)
      );

      if (hasVoted) {
        toast({ title: 'You already voted', variant: 'destructive' });
        return;
      }

      // Add vote
      const newVotes = { ...poll.votes };
      if (!newVotes[optionId]) {
        newVotes[optionId] = [];
      }
      newVotes[optionId].push(user.id);

      const { error } = await supabase
        .from('stream_polls')
        .update({ votes: newVotes })
        .eq('id', pollId);

      if (error) throw error;

      toast({ title: 'Vote recorded!' });
    } catch (error: any) {
      toast({
        title: 'Failed to vote',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [user, polls, toast]);

  // End poll
  const endPoll = useCallback(async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('stream_polls')
        .update({ is_active: false })
        .eq('id', pollId);

      if (error) throw error;

      toast({ title: 'Poll ended' });
    } catch (error: any) {
      toast({
        title: 'Failed to end poll',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Delete poll
  const deletePoll = useCallback(async (pollId: string) => {
    try {
      const { error } = await supabase
        .from('stream_polls')
        .delete()
        .eq('id', pollId);

      if (error) throw error;

      toast({ title: 'Poll deleted' });
    } catch (error: any) {
      toast({
        title: 'Failed to delete poll',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Get vote counts
  const getVoteCounts = useCallback((poll: StreamPoll) => {
    const counts: Record<string, number> = {};
    let total = 0;

    poll.options.forEach(opt => {
      const count = poll.votes[opt.id]?.length || 0;
      counts[opt.id] = count;
      total += count;
    });

    return { counts, total };
  }, []);

  // Check if user voted
  const hasUserVoted = useCallback((poll: StreamPoll) => {
    if (!user) return false;
    return Object.values(poll.votes).some(voters => 
      voters.includes(user.id)
    );
  }, [user]);

  return {
    polls,
    activePoll,
    loading,
    createPoll,
    vote,
    endPoll,
    deletePoll,
    getVoteCounts,
    hasUserVoted,
    refetch: fetchPolls,
  };
}
