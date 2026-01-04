import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';

export interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  profile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface UseTeamMembersReturn {
  members: TeamMember[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTeamMembers(): UseTeamMembersReturn {
  const { business } = useBusiness();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch business members with their profiles
      const { data: membersData, error: membersError } = await supabase
        .from('business_members')
        .select('id, user_id, role, is_active')
        .eq('business_id', business.id)
        .eq('is_active', true);

      if (membersError) throw membersError;

      // Fetch profiles for all members
      const userIds = membersData.map(m => m.user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Merge members with profiles
      const membersWithProfiles: TeamMember[] = membersData.map(member => {
        const profile = profilesData?.find(p => p.user_id === member.user_id);
        return {
          ...member,
          profile: profile ? {
            id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            avatar_url: profile.avatar_url,
          } : undefined,
        };
      });

      // Also include the business owner
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, avatar_url')
        .eq('user_id', business.owner_id)
        .maybeSingle();

      if (!ownerError && ownerProfile) {
        const ownerExists = membersWithProfiles.some(m => m.user_id === business.owner_id);
        if (!ownerExists) {
          membersWithProfiles.unshift({
            id: 'owner',
            user_id: business.owner_id,
            role: 'owner',
            is_active: true,
            profile: {
              id: ownerProfile.id,
              full_name: ownerProfile.full_name,
              email: ownerProfile.email,
              avatar_url: ownerProfile.avatar_url,
            },
          });
        }
      }

      setMembers(membersWithProfiles);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch team members';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [business?.id, business?.owner_id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
  };
}
