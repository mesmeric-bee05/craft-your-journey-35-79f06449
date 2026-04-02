import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useCompetitors() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const { data: competitors = [], isLoading } = useQuery({
    queryKey: ['competitors', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const { data, error } = await supabase
        .from('competitors' as any)
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!businessId,
  });

  const addCompetitor = useMutation({
    mutationFn: async (input: { name: string; website?: string; industry?: string; notes?: string; social_handles?: Record<string, string> }) => {
      if (!businessId) throw new Error('No business');
      const { error } = await supabase
        .from('competitors' as any)
        .insert({ ...input, business_id: businessId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors', businessId] });
      toast.success('Competitor added');
    },
    onError: () => toast.error('Failed to add competitor'),
  });

  const deleteCompetitor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competitors' as any)
        .update({ is_active: false } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors', businessId] });
      toast.success('Competitor removed');
    },
    onError: () => toast.error('Failed to remove competitor'),
  });

  return { competitors, isLoading, addCompetitor, deleteCompetitor };
}
