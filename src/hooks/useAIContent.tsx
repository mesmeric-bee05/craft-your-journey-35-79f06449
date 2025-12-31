import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface AIContent {
  id: string;
  business_id: string;
  user_id: string;
  prompt: string;
  content: string;
  content_type: 'caption' | 'description' | 'email' | 'sms' | 'blog' | 'ad_copy' | 'hashtags';
  language: string;
  tone: string;
  platform: string | null;
  tokens_used: number;
  rating: number | null;
  is_used: boolean;
  created_at: string;
}

interface GenerateContentParams {
  prompt: string;
  contentType: AIContent['content_type'];
  language?: string;
  tone?: string;
  platform?: string;
}

interface UseAIContentReturn {
  contentHistory: AIContent[];
  loading: boolean;
  generating: boolean;
  error: string | null;
  generateContent: (params: GenerateContentParams) => Promise<string | null>;
  rateContent: (id: string, rating: number) => Promise<void>;
  markAsUsed: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useAIContent(): UseAIContentReturn {
  const { business } = useBusiness();
  const { user } = useAuth();
  const { toast } = useToast();
  const [contentHistory, setContentHistory] = useState<AIContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContentHistory = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('ai_content')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setContentHistory(data as unknown as AIContent[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchContentHistory();
  }, [fetchContentHistory]);

  const generateContent = async (params: GenerateContentParams): Promise<string | null> => {
    if (!business?.id || !user) {
      toast({ title: 'Error', description: 'Business not found', variant: 'destructive' });
      return null;
    }

    try {
      setGenerating(true);
      setError(null);

      const { data, error: invokeError } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: params.prompt,
          contentType: params.contentType,
          language: params.language || 'en',
          tone: params.tone || 'professional',
          platform: params.platform,
          businessId: business.id,
          userId: user.id,
        },
      });

      if (invokeError) throw invokeError;

      const generatedContent = data?.content;

      if (generatedContent) {
        // Save to database
        await supabase.from('ai_content').insert({
          business_id: business.id,
          user_id: user.id,
          prompt: params.prompt,
          content: generatedContent,
          content_type: params.contentType,
          language: params.language || 'en',
          tone: params.tone || 'professional',
          platform: params.platform,
          tokens_used: data?.tokensUsed || 0,
        } as any);

        fetchContentHistory();
        toast({ title: 'Content generated successfully!' });
        return generatedContent;
      }

      return null;
    } catch (err: any) {
      setError(err.message);
      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const rateContent = async (id: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('ai_content')
        .update({ rating })
        .eq('id', id);

      if (error) throw error;

      setContentHistory((prev) =>
        prev.map((c) => (c.id === id ? { ...c, rating } : c))
      );
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const markAsUsed = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_content')
        .update({ is_used: true })
        .eq('id', id);

      if (error) throw error;

      setContentHistory((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_used: true } : c))
      );
    } catch (err: any) {
      console.error('Error marking as used:', err);
    }
  };

  return {
    contentHistory,
    loading,
    generating,
    error,
    generateContent,
    rateContent,
    markAsUsed,
    refetch: fetchContentHistory,
  };
}
