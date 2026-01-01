import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type JobPosting = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  skills_required: string[];
  job_type: 'one_time' | 'ongoing' | 'full_time' | 'part_time';
  budget_type: 'fixed' | 'hourly';
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  duration: string | null;
  status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled';
  deadline: string | null;
  location_type: 'remote' | 'onsite' | 'hybrid';
  applications_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export function useJobPostings() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: jobPostings = [], isLoading } = useQuery({
    queryKey: ['job-postings', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobPosting[];
    },
  });

  const { data: myJobPostings = [] } = useQuery({
    queryKey: ['my-job-postings', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobPosting[];
    },
    enabled: !!business?.id,
  });

  const createJobPosting = useMutation({
    mutationFn: async (job: Partial<JobPosting>) => {
      if (!business?.id || !user?.id) throw new Error('Not authenticated or no business');
      
      const { data, error } = await supabase
        .from('job_postings')
        .insert({
          business_id: business.id,
          created_by: user.id,
          title: job.title || 'Untitled Job',
          ...job,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      queryClient.invalidateQueries({ queryKey: ['my-job-postings'] });
      toast({ title: 'Job posting created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create job posting', description: error.message, variant: 'destructive' });
    },
  });

  const updateJobPosting = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<JobPosting> & { id: string }) => {
      const { data, error } = await supabase
        .from('job_postings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      queryClient.invalidateQueries({ queryKey: ['my-job-postings'] });
      toast({ title: 'Job posting updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update job posting', description: error.message, variant: 'destructive' });
    },
  });

  const deleteJobPosting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('job_postings')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
      queryClient.invalidateQueries({ queryKey: ['my-job-postings'] });
      toast({ title: 'Job posting deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete job posting', description: error.message, variant: 'destructive' });
    },
  });

  return {
    jobPostings,
    myJobPostings,
    isLoading,
    createJobPosting,
    updateJobPosting,
    deleteJobPosting,
  };
}
