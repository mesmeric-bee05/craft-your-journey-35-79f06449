import { useState } from 'react';
import { Plus, Users, Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useTeamInvitations } from '@/hooks/useTeamInvitations';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { TeamMembersList } from './team/TeamMembersList';
import { PendingInvitations } from './team/PendingInvitations';
import { InviteMemberDialog } from './team/InviteMemberDialog';

export function TeamSettings() {
  const { user } = useAuth();
  const { business, loading: businessLoading } = useBusiness();
  const { members, loading: membersLoading, refetch: refetchMembers } = useTeamMembers();
  const { invitations, loading: invitationsLoading, sendInvitation, cancelInvitation, resendInvitation } = useTeamInvitations();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  const isOwner = business?.owner_id === user?.id;
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  const handleInvite = async (email: string, role: string) => {
    const success = await sendInvitation(email, role);
    if (success) {
      setInviteDialogOpen(false);
    }
    return success;
  };

  if (businessLoading || membersLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!business) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Business Found</h3>
          <p className="text-muted-foreground text-center max-w-md">
            You need to create or join a business to manage team members.
            Complete the onboarding process to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              {members.length} {members.length === 1 ? 'member' : 'members'} in your team
              {pendingInvitations.length > 0 && ` · ${pendingInvitations.length} pending invitations`}
            </CardDescription>
          </div>
          {isOwner && (
            <Button onClick={() => setInviteDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="members" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="members">
                Active Members ({members.length})
              </TabsTrigger>
              {isOwner && (
                <TabsTrigger value="invitations">
                  Pending Invitations ({pendingInvitations.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="members">
              <TeamMembersList
                members={members}
                currentUserId={user?.id || ''}
                businessOwnerId={business.owner_id}
                isOwner={isOwner}
                onMemberUpdated={refetchMembers}
              />
            </TabsContent>

            {isOwner && (
              <TabsContent value="invitations">
                <PendingInvitations
                  invitations={pendingInvitations}
                  loading={invitationsLoading}
                  onCancel={cancelInvitation}
                  onResend={resendInvitation}
                />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onInvite={handleInvite}
      />
    </div>
  );
}
