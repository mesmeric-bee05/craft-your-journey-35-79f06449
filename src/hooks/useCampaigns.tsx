import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Campaign {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
  type: 'social' | 'email' | 'sms' | 'multi_channel';
  target_channels: string[];
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  metrics: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateCampaignParams {
  name: string;
  description?: string;
  type: Campaign['type'];
  targetChannels?: string[];
  startDate?: string;
  endDate?: string;
  budget?: number;
}

interface UseCampaignsReturn {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  createCampaign: (params: CreateCampaignParams) => Promise<Campaign | null>;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCampaigns(): UseCampaignsReturn {
  const { business } = useBusiness();
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCampaigns(data as unknown as Campaign[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = async (params: CreateCampaignParams): Promise<Campaign | null> => {
    if (!business?.id || !user) return null;

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          business_id: business.id,
          name: params.name,
          description: params.description,
          type: params.type,
          target_channels: params.targetChannels || [],
          start_date: params.startDate,
          end_date: params.endDate,
          budget: params.budget,
          created_by: user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Campaign created!' });
      fetchCampaigns();
      return data as unknown as Campaign;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      return null;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;

      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );

      toast({ title: 'Campaign updated!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: 'cancelled' } as any)
        .eq('id', id);

      if (error) throw error;

      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast({ title: 'Campaign deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    refetch: fetchCampaigns,
  };
}
