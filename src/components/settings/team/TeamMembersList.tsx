import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TeamMember } from '@/hooks/useTeamMembers';
import { MemberCard } from './MemberCard';

interface TeamMembersListProps {
  members: TeamMember[];
  currentUserId: string;
  businessOwnerId: string;
  isOwner: boolean;
  onMemberUpdated: () => void;
}

export function TeamMembersList({
  members,
  currentUserId,
  businessOwnerId,
  isOwner,
  onMemberUpdated,
}: TeamMembersListProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (memberId === 'owner') {
      toast.error('Cannot change owner role');
      return;
    }

    setUpdating(memberId);
    try {
      const { error } = await supabase
        .from('business_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Role updated successfully');
      onMemberUpdated();
    } catch (err) {
      toast.error('Failed to update role');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (userId === businessOwnerId) {
      toast.error('Cannot remove the business owner');
      return;
    }

    setUpdating(memberId);
    try {
      const { error } = await supabase
        .from('business_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member removed successfully');
      onMemberUpdated();
    } catch (err) {
      toast.error('Failed to remove member');
    } finally {
      setUpdating(null);
    }
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No team members yet. Invite someone to get started!
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {members.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          isCurrentUser={member.user_id === currentUserId}
          isBusinessOwner={member.user_id === businessOwnerId}
          canManage={isOwner && member.user_id !== businessOwnerId}
          isUpdating={updating === member.id}
          onUpdateRole={(role) => handleUpdateRole(member.id, role)}
          onRemove={() => handleRemoveMember(member.id, member.user_id)}
        />
      ))}
    </div>
  );
}
