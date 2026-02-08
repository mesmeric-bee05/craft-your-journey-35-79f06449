import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness, Business } from '@/hooks/useBusiness';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface SLAPolicy {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  first_response_target: number;
  resolution_target: number;
  warning_threshold: number;
  priority_overrides: Record<string, { first_response_target?: number; resolution_target?: number }>;
  channel_overrides: Record<string, { first_response_target?: number; resolution_target?: number }>;
  business_hours: {
    enabled: boolean;
    timezone?: string;
    schedule?: Record<string, { start: string; end: string }>;
  } | null;
  created_at: string;
  updated_at: string;
}

export type SLAPolicyInsert = Omit<SLAPolicy, 'id' | 'created_at' | 'updated_at'>;
export type SLAPolicyUpdate = Partial<Omit<SLAPolicy, 'id' | 'business_id' | 'created_at' | 'updated_at'>>;

interface UseSLAPoliciesReturn {
  policies: SLAPolicy[];
  defaultPolicy: SLAPolicy | null;
  loading: boolean;
  error: string | null;
  // Expose business state to avoid double-hook calls
  business: Business | null;
  businessLoading: boolean;
  createPolicy: (policy: Omit<SLAPolicyInsert, 'business_id'>) => Promise<SLAPolicy | null>;
  updatePolicy: (id: string, updates: SLAPolicyUpdate) => Promise<boolean>;
  deletePolicy: (id: string) => Promise<boolean>;
  setAsDefault: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useSLAPolicies(): UseSLAPoliciesReturn {
  const { business, loading: businessLoading, error: businessError } = useBusiness();
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    if (!business?.id) {
      setPolicies([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('sla_policies')
        .select('*')
        .eq('business_id', business.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPolicies((data || []) as SLAPolicy[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch SLA policies';
      setError(message);
      logger.error('Error fetching SLA policies', err, { hook: 'useSLAPolicies' });
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const createPolicy = async (policy: Omit<SLAPolicyInsert, 'business_id'>): Promise<SLAPolicy | null> => {
    if (!business?.id) {
      toast.error('No business selected');
      return null;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('sla_policies')
        .insert({
          ...policy,
          business_id: business.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newPolicy = data as SLAPolicy;
      setPolicies(prev => [newPolicy, ...prev]);
      toast.success('SLA policy created');
      return newPolicy;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create SLA policy';
      toast.error(message);
      logger.error('Error creating SLA policy', err, { hook: 'useSLAPolicies' });
      return null;
    }
  };

  const updatePolicy = async (id: string, updates: SLAPolicyUpdate): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('sla_policies')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      setPolicies(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      toast.success('SLA policy updated');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update SLA policy';
      toast.error(message);
      logger.error('Error updating SLA policy', err, { hook: 'useSLAPolicies', policyId: id });
      return false;
    }
  };

  const deletePolicy = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('sla_policies')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setPolicies(prev => prev.filter(p => p.id !== id));
      toast.success('SLA policy deleted');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete SLA policy';
      toast.error(message);
      logger.error('Error deleting SLA policy', err, { hook: 'useSLAPolicies', policyId: id });
      return false;
    }
  };

  const setAsDefault = async (id: string): Promise<boolean> => {
    if (!business?.id) return false;

    try {
      // First, unset all other defaults for this business
      const { error: unsetError } = await supabase
        .from('sla_policies')
        .update({ is_default: false })
        .eq('business_id', business.id)
        .neq('id', id);

      if (unsetError) throw unsetError;

      // Then set this one as default
      const { error: setError } = await supabase
        .from('sla_policies')
        .update({ is_default: true })
        .eq('id', id);

      if (setError) throw setError;

      setPolicies(prev => prev.map(p => ({
        ...p,
        is_default: p.id === id,
      })));

      toast.success('Default SLA policy updated');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set default policy';
      toast.error(message);
      logger.error('Error setting default SLA policy', err, { hook: 'useSLAPolicies', policyId: id });
      return false;
    }
  };

  const defaultPolicy = policies.find(p => p.is_default && p.is_active) || policies.find(p => p.is_active) || null;

  // Combine loading states - show loading if either business or policies are loading
  const combinedLoading = businessLoading || loading;
  
  // Combine errors - prioritize business error since it's foundational
  const combinedError = businessError || error;

  return {
    policies,
    defaultPolicy,
    loading: combinedLoading,
    error: combinedError,
    business,
    businessLoading,
    createPolicy,
    updatePolicy,
    deletePolicy,
    setAsDefault,
    refetch: fetchPolicies,
  };
}
