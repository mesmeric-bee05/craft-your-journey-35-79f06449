import { format, isPast } from 'date-fns';
import { Clock, Mail, MoreVertical, RefreshCw, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamInvitation } from '@/hooks/useTeamInvitations';

interface PendingInvitationsProps {
  invitations: TeamInvitation[];
  loading: boolean;
  onCancel: (id: string) => Promise<boolean>;
  onResend: (id: string) => Promise<boolean>;
}

export function PendingInvitations({
  invitations,
  loading,
  onCancel,
  onResend,
}: PendingInvitationsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => {
        const isExpired = isPast(new Date(invitation.expires_at));
        
        return (
          <div
            key={invitation.id}
            className="flex items-center justify-between p-4 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{invitation.email}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Invited by {invitation.inviter_name}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isExpired ? (
                      <span className="text-destructive">Expired</span>
                    ) : (
                      <span>Expires {format(new Date(invitation.expires_at), 'MMM d')}</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="capitalize">
                {invitation.role}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onResend(invitation.id)}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Invitation
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onCancel(invitation.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel Invitation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
