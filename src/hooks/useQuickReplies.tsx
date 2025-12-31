import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';

export interface QuickReply {
  id: string;
  business_id: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string | null;
  usage_count: number;
  is_active: boolean;
  created_at: string;
}

interface UseQuickRepliesReturn {
  quickReplies: QuickReply[];
  loading: boolean;
  error: string | null;
  addQuickReply: (title: string, content: string, shortcut?: string, category?: string) => Promise<void>;
  deleteQuickReply: (id: string) => Promise<void>;
  incrementUsage: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useQuickReplies(): UseQuickRepliesReturn {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuickReplies = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (fetchError) throw fetchError;

      setQuickReplies(data as unknown as QuickReply[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchQuickReplies();
  }, [fetchQuickReplies]);

  const addQuickReply = async (title: string, content: string, shortcut?: string, category?: string) => {
    if (!business?.id) return;

    try {
      const { error } = await supabase.from('quick_replies').insert({
        business_id: business.id,
        title,
        content,
        shortcut,
        category,
      } as any);

      if (error) throw error;

      toast({ title: 'Quick reply added!' });
      fetchQuickReplies();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteQuickReply = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quick_replies')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      setQuickReplies((prev) => prev.filter((qr) => qr.id !== id));
      toast({ title: 'Quick reply deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const incrementUsage = async (id: string) => {
    try {
      const reply = quickReplies.find((qr) => qr.id === id);
      if (!reply) return;

      await supabase
        .from('quick_replies')
        .update({ usage_count: reply.usage_count + 1 })
        .eq('id', id);
    } catch (err) {
      console.error('Error incrementing usage:', err);
    }
  };

  return {
    quickReplies,
    loading,
    error,
    addQuickReply,
    deleteQuickReply,
    incrementUsage,
    refetch: fetchQuickReplies,
  };
}
