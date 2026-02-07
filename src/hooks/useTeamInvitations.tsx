import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface TeamInvitation {
  id: string;
  business_id: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invited_by: string;
  expires_at: string;
  created_at: string;
  inviter_name?: string;
}

interface UseTeamInvitationsReturn {
  invitations: TeamInvitation[];
  loading: boolean;
  error: string | null;
  sendInvitation: (email: string, role: string) => Promise<boolean>;
  cancelInvitation: (id: string) => Promise<boolean>;
  resendInvitation: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useTeamInvitations(): UseTeamInvitationsReturn {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    if (!business?.id) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch inviter profiles
      const inviterIds = [...new Set((data || []).map(inv => inv.invited_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', inviterIds);

      const invitationsWithNames = (data || []).map(inv => ({
        ...inv,
        status: inv.status as TeamInvitation['status'],
        inviter_name: profiles?.find(p => p.user_id === inv.invited_by)?.full_name || 'Unknown',
      }));

      setInvitations(invitationsWithNames);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch invitations';
      setError(message);
      logger.error('Error fetching team invitations', err, { hook: 'useTeamInvitations' });
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const sendInvitation = async (email: string, role: string): Promise<boolean> => {
    if (!business?.id || !user?.id) {
      toast.error('No business selected');
      return false;
    }

    try {
      // Check if invitation already exists
      const { data: existing } = await supabase
        .from('team_invitations')
        .select('id, status')
        .eq('business_id', business.id)
        .eq('email', email.toLowerCase())
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        toast.error('An invitation for this email is already pending');
        return false;
      }

      // Check if user is already a member
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        const { data: existingMember } = await supabase
          .from('business_members')
          .select('id')
          .eq('business_id', business.id)
          .eq('user_id', existingProfile.user_id)
          .eq('is_active', true)
          .maybeSingle();

        if (existingMember) {
          toast.error('This user is already a team member');
          return false;
        }
      }

      const { data, error: insertError } = await supabase
        .from('team_invitations')
        .insert({
          business_id: business.id,
          email: email.toLowerCase(),
          role,
          invited_by: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setInvitations(prev => [{
        ...data,
        status: data.status as TeamInvitation['status'],
        inviter_name: 'You',
      }, ...prev]);

      toast.success(`Invitation sent to ${email}`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation';
      toast.error(message);
      logger.error('Error sending invitation', err, { hook: 'useTeamInvitations' });
      return false;
    }
  };

  const cancelInvitation = async (id: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (updateError) throw updateError;

      setInvitations(prev => prev.map(inv => 
        inv.id === id ? { ...inv, status: 'cancelled' as const } : inv
      ));

      toast.success('Invitation cancelled');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to cancel invitation';
      toast.error(message);
      logger.error('Error cancelling invitation', err, { hook: 'useTeamInvitations', invitationId: id });
      return false;
    }
  };

  const resendInvitation = async (id: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const invitation = invitations.find(inv => inv.id === id);
      if (!invitation) {
        toast.error('Invitation not found');
        return false;
      }

      // Cancel the old invitation
      await supabase
        .from('team_invitations')
        .update({ status: 'cancelled' })
        .eq('id', id);

      // Create a new invitation
      const { data, error: insertError } = await supabase
        .from('team_invitations')
        .insert({
          business_id: invitation.business_id,
          email: invitation.email,
          role: invitation.role,
          invited_by: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setInvitations(prev => [
        {
          ...data,
          status: data.status as TeamInvitation['status'],
          inviter_name: 'You',
        },
        ...prev.filter(inv => inv.id !== id),
      ]);

      toast.success('Invitation resent');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resend invitation';
      toast.error(message);
      logger.error('Error resending invitation', err, { hook: 'useTeamInvitations', invitationId: id });
      return false;
    }
  };

  return {
    invitations,
    loading,
    error,
    sendInvitation,
    cancelInvitation,
    resendInvitation,
    refetch: fetchInvitations,
  };
}
