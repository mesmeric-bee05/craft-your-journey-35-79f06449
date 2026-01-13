import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface CSATSurvey {
  id: string;
  business_id: string;
  name: string;
  question: string;
  is_active: boolean;
  is_default: boolean;
  trigger_on_resolution: boolean;
  delay_minutes: number;
  scale_type: '5-star' | 'emoji' | 'nps';
  include_comment: boolean;
  comment_prompt: string;
  thank_you_message: string;
  created_at: string;
  updated_at: string;
}

export interface CSATResponse {
  id: string;
  business_id: string;
  survey_id: string;
  conversation_id: string;
  customer_id: string;
  assigned_agent_id: string | null;
  rating: number;
  comment: string | null;
  channel_type: string;
  responded_at: string;
  created_at: string;
}

export interface CSATMetrics {
  total_responses: number;
  avg_rating: number;
  nps_score: number;
  rating_1_count: number;
  rating_2_count: number;
  rating_3_count: number;
  rating_4_count: number;
  rating_5_count: number;
  response_rate: number;
}

export interface CSATByAgent {
  agent_id: string;
  agent_name: string;
  total_responses: number;
  avg_rating: number;
}

export interface CSATByChannel {
  channel_type: string;
  total_responses: number;
  avg_rating: number;
}

interface UseCSATSurveysReturn {
  surveys: CSATSurvey[];
  responses: CSATResponse[];
  metrics: CSATMetrics | null;
  byAgent: CSATByAgent[];
  byChannel: CSATByChannel[];
  loading: boolean;
  error: string | null;
  createSurvey: (survey: Partial<CSATSurvey>) => Promise<void>;
  updateSurvey: (id: string, updates: Partial<CSATSurvey>) => Promise<void>;
  deleteSurvey: (id: string) => Promise<void>;
  setAsDefault: (id: string) => Promise<void>;
  fetchMetrics: (startDate?: Date, endDate?: Date) => Promise<void>;
  fetchByAgent: (startDate?: Date, endDate?: Date) => Promise<void>;
  fetchByChannel: (startDate?: Date, endDate?: Date) => Promise<void>;
  fetchResponses: (limit?: number) => Promise<void>;
  submitResponse: (surveyId: string, conversationId: string, rating: number, comment?: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCSATSurveys(): UseCSATSurveysReturn {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [surveys, setSurveys] = useState<CSATSurvey[]>([]);
  const [responses, setResponses] = useState<CSATResponse[]>([]);
  const [metrics, setMetrics] = useState<CSATMetrics | null>(null);
  const [byAgent, setByAgent] = useState<CSATByAgent[]>([]);
  const [byChannel, setByChannel] = useState<CSATByChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('csat_surveys')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSurveys(data as unknown as CSATSurvey[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  const fetchMetrics = useCallback(async (startDate?: Date, endDate?: Date) => {
    if (!business?.id) return;

    try {
      const { data, error: fetchError } = await supabase.rpc('get_csat_metrics', {
        p_business_id: business.id,
        p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate?.toISOString() || new Date().toISOString(),
      });

      if (fetchError) throw fetchError;
      if (data && data[0]) {
        setMetrics(data[0] as CSATMetrics);
      }
    } catch (err: any) {
      logger.error('Error fetching CSAT metrics', err, { hook: 'useCSATSurveys' });
    }
  }, [business?.id]);

  const fetchByAgent = useCallback(async (startDate?: Date, endDate?: Date) => {
    if (!business?.id) return;

    try {
      const { data, error: fetchError } = await supabase.rpc('get_csat_by_agent', {
        p_business_id: business.id,
        p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate?.toISOString() || new Date().toISOString(),
      });

      if (fetchError) throw fetchError;
      setByAgent(data as CSATByAgent[]);
    } catch (err: any) {
      logger.error('Error fetching CSAT by agent', err, { hook: 'useCSATSurveys' });
    }
  }, [business?.id]);

  const fetchByChannel = useCallback(async (startDate?: Date, endDate?: Date) => {
    if (!business?.id) return;

    try {
      const { data, error: fetchError } = await supabase.rpc('get_csat_by_channel', {
        p_business_id: business.id,
        p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate?.toISOString() || new Date().toISOString(),
      });

      if (fetchError) throw fetchError;
      setByChannel(data as CSATByChannel[]);
    } catch (err: any) {
      logger.error('Error fetching CSAT by channel', err, { hook: 'useCSATSurveys' });
    }
  }, [business?.id]);

  const fetchResponses = useCallback(async (limit = 50) => {
    if (!business?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('csat_responses')
        .select('*')
        .eq('business_id', business.id)
        .order('responded_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setResponses(data as unknown as CSATResponse[]);
    } catch (err: any) {
      logger.error('Error fetching CSAT responses', err, { hook: 'useCSATSurveys' });
    }
  }, [business?.id]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const createSurvey = async (survey: Partial<CSATSurvey>) => {
    if (!business?.id) return;

    try {
      const { error } = await supabase.from('csat_surveys').insert({
        business_id: business.id,
        name: survey.name || 'New Survey',
        question: survey.question || 'How satisfied were you with our support?',
        scale_type: survey.scale_type || '5-star',
        is_active: survey.is_active ?? true,
        is_default: survey.is_default ?? false,
        trigger_on_resolution: survey.trigger_on_resolution ?? true,
        delay_minutes: survey.delay_minutes ?? 0,
        include_comment: survey.include_comment ?? true,
        comment_prompt: survey.comment_prompt || 'Any additional feedback?',
        thank_you_message: survey.thank_you_message || 'Thank you for your feedback!',
      } as any);

      if (error) throw error;
      toast({ title: 'Survey created successfully!' });
      fetchSurveys();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const updateSurvey = async (id: string, updates: Partial<CSATSurvey>) => {
    try {
      const { error } = await supabase
        .from('csat_surveys')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Survey updated!' });
      fetchSurveys();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteSurvey = async (id: string) => {
    try {
      const { error } = await supabase.from('csat_surveys').delete().eq('id', id);

      if (error) throw error;
      toast({ title: 'Survey deleted' });
      setSurveys((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const setAsDefault = async (id: string) => {
    if (!business?.id) return;

    try {
      // First, unset any existing default
      await supabase
        .from('csat_surveys')
        .update({ is_default: false } as any)
        .eq('business_id', business.id);

      // Then set the new default
      const { error } = await supabase
        .from('csat_surveys')
        .update({ is_default: true } as any)
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Default survey updated!' });
      fetchSurveys();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const submitResponse = async (surveyId: string, conversationId: string, rating: number, comment?: string) => {
    if (!business?.id) return;

    try {
      // Get conversation details
      const { data: conversation } = await supabase
        .from('conversations')
        .select('customer_id, assigned_to, channel_type')
        .eq('id', conversationId)
        .single();

      if (!conversation) throw new Error('Conversation not found');

      const { error } = await supabase.from('csat_responses').insert({
        business_id: business.id,
        survey_id: surveyId,
        conversation_id: conversationId,
        customer_id: conversation.customer_id,
        assigned_agent_id: conversation.assigned_to,
        rating,
        comment,
        channel_type: conversation.channel_type,
      } as any);

      if (error) throw error;
      toast({ title: 'Thank you for your feedback!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return {
    surveys,
    responses,
    metrics,
    byAgent,
    byChannel,
    loading,
    error,
    createSurvey,
    updateSurvey,
    deleteSurvey,
    setAsDefault,
    fetchMetrics,
    fetchByAgent,
    fetchByChannel,
    fetchResponses,
    submitResponse,
    refetch: fetchSurveys,
  };
}
