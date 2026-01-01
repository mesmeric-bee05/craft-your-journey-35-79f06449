import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type FreelancerProfile = {
  id: string;
  user_id: string;
  business_id: string | null;
  headline: string | null;
  bio: string | null;
  skills: string[];
  hourly_rate: number | null;
  currency: string;
  availability: 'available' | 'busy' | 'unavailable';
  portfolio_urls: string[];
  experience_years: number;
  rating: number;
  total_jobs: number;
  is_verified: boolean;
  location: string | null;
  languages: string[];
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export function useFreelancers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: freelancers = [], isLoading } = useQuery({
    queryKey: ['freelancers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freelancer_profiles')
        .select('*')
        .order('rating', { ascending: false });

      if (error) throw error;
      return data as FreelancerProfile[];
    },
  });

  const { data: myProfile } = useQuery({
    queryKey: ['my-freelancer-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('freelancer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as FreelancerProfile | null;
    },
    enabled: !!user?.id,
  });

  const createProfile = useMutation({
    mutationFn: async (profile: Omit<Partial<FreelancerProfile>, 'id' | 'user_id' | 'metadata'>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('freelancer_profiles')
        .insert({
          user_id: user.id,
          ...profile,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freelancers'] });
      queryClient.invalidateQueries({ queryKey: ['my-freelancer-profile'] });
      toast({ title: 'Profile created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create profile', description: error.message, variant: 'destructive' });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, metadata, ...updates }: Partial<FreelancerProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from('freelancer_profiles')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freelancers'] });
      queryClient.invalidateQueries({ queryKey: ['my-freelancer-profile'] });
      toast({ title: 'Profile updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    },
  });

  return {
    freelancers,
    myProfile,
    isLoading,
    createProfile,
    updateProfile,
  };
}
