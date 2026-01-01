import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFreelancers } from './useFreelancers';
import { useToast } from './use-toast';

export type JobApplication = {
  id: string;
  job_id: string;
  freelancer_id: string;
  cover_letter: string | null;
  proposed_rate: number | null;
  proposed_duration: string | null;
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';
  attachments: unknown[];
  created_at: string;
  updated_at: string;
};

export function useJobApplications(jobId?: string) {
  const { myProfile } = useFreelancers();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['job-applications', jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobApplication[];
    },
    enabled: !!jobId,
  });

  const { data: myApplications = [] } = useQuery({
    queryKey: ['my-applications', myProfile?.id],
    queryFn: async () => {
      if (!myProfile?.id) return [];
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('freelancer_id', myProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as JobApplication[];
    },
    enabled: !!myProfile?.id,
  });

  const applyToJob = useMutation({
    mutationFn: async (application: { job_id: string; cover_letter?: string; proposed_rate?: number; proposed_duration?: string }) => {
      if (!myProfile?.id) throw new Error('Create a freelancer profile first');
      
      const { data, error } = await supabase
        .from('job_applications')
        .insert({
          freelancer_id: myProfile.id,
          ...application,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      toast({ title: 'Application submitted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to apply', description: error.message, variant: 'destructive' });
    },
  });

  const updateApplicationStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: JobApplication['status'] }) => {
      const { data, error } = await supabase
        .from('job_applications')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      toast({ title: 'Application status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    },
  });

  const withdrawApplication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-applications'] });
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      toast({ title: 'Application withdrawn' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to withdraw application', description: error.message, variant: 'destructive' });
    },
  });

  return {
    applications,
    myApplications,
    isLoading,
    applyToJob,
    updateApplicationStatus,
    withdrawApplication,
  };
}
