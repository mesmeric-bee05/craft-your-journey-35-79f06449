import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  industry: string | null;
  business_type: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  onboarding_step: number;
  onboarding_completed: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseBusinessReturn {
  business: Business | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  hasCompletedOnboarding: boolean;
}

export function useBusiness(): UseBusinessReturn {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusiness = useCallback(async () => {
    if (!user) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // First try to find businesses where user is owner
      const { data: ownedBusiness, error: ownedError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ownedError) throw ownedError;

      if (ownedBusiness) {
        setBusiness(ownedBusiness as Business);
        return;
      }

      // If not an owner, check business_members for membership
      const { data: membership, error: memberError } = await supabase
        .from('business_members')
        .select('business_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (memberError) throw memberError;

      if (membership?.business_id) {
        const { data: memberBusiness, error: businessError } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', membership.business_id)
          .eq('is_active', true)
          .single();

        if (businessError) throw businessError;
        setBusiness(memberBusiness as Business);
        return;
      }

      // No business found
      setBusiness(null);
    } catch (err: any) {
      setError(err.message);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const hasCompletedOnboarding = business?.onboarding_completed ?? false;

  return {
    business,
    loading,
    error,
    refetch: fetchBusiness,
    hasCompletedOnboarding,
  };
}
