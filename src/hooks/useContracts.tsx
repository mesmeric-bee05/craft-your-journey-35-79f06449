import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { useFreelancers } from './useFreelancers';
import { useToast } from './use-toast';

export type Contract = {
  id: string;
  job_id: string | null;
  business_id: string;
  freelancer_id: string;
  title: string;
  description: string | null;
  rate: number;
  rate_type: 'fixed' | 'hourly';
  currency: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled' | 'disputed';
  start_date: string | null;
  end_date: string | null;
  total_paid: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export function useContracts() {
  const { business } = useBusiness();
  const { myProfile } = useFreelancers();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: businessContracts = [], isLoading: loadingBusiness } = useQuery({
    queryKey: ['business-contracts', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!business?.id,
  });

  const { data: freelancerContracts = [], isLoading: loadingFreelancer } = useQuery({
    queryKey: ['freelancer-contracts', myProfile?.id],
    queryFn: async () => {
      if (!myProfile?.id) return [];
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('freelancer_id', myProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!myProfile?.id,
  });

  const createContract = useMutation({
    mutationFn: async (contract: Omit<Partial<Contract>, 'id' | 'metadata'> & { freelancer_id: string }) => {
      if (!business?.id) throw new Error('No business selected');
      
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          business_id: business.id,
          title: contract.title || 'Untitled Contract',
          rate: contract.rate || 0,
          freelancer_id: contract.freelancer_id,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['freelancer-contracts'] });
      toast({ title: 'Contract created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create contract', description: error.message, variant: 'destructive' });
    },
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, metadata, ...updates }: Partial<Contract> & { id: string }) => {
      // SECURITY: financial terms (rate, total_paid) are guarded server-side
      // and must never be sent from the client on a generic update.
      const safeUpdates = { ...updates } as Record<string, unknown>;
      delete safeUpdates.rate;
      delete safeUpdates.total_paid;
      const { data, error } = await supabase
        .from('contracts')
        .update(safeUpdates as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['freelancer-contracts'] });
      toast({ title: 'Contract updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update contract', description: error.message, variant: 'destructive' });
    },
  });

  return {
    businessContracts,
    freelancerContracts,
    isLoading: loadingBusiness || loadingFreelancer,
    createContract,
    updateContract,
  };
}
