import { Crown, MoreVertical, Shield, User, UserMinus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TeamMember } from '@/hooks/useTeamMembers';

interface MemberCardProps {
  member: TeamMember;
  isCurrentUser: boolean;
  isBusinessOwner: boolean;
  canManage: boolean;
  isUpdating: boolean;
  onUpdateRole: (role: string) => void;
  onRemove: () => void;
}

const roleConfig: Record<string, { label: string; icon: typeof Crown; color: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  admin: { label: 'Admin', icon: Shield, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  member: { label: 'Member', icon: User, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
  viewer: { label: 'Viewer', icon: User, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

export function MemberCard({
  member,
  isCurrentUser,
  isBusinessOwner,
  canManage,
  isUpdating,
  onUpdateRole,
  onRemove,
}: MemberCardProps) {
  const role = roleConfig[member.role] || roleConfig.member;
  const RoleIcon = role.icon;
  const initials = member.profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.profile?.avatar_url || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {member.profile?.full_name || 'Unknown User'}
            </span>
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs">You</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {member.profile?.email || 'No email'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge className={`${role.color} border-0`}>
          <RoleIcon className="h-3 w-3 mr-1" />
          {role.label}
        </Badge>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isUpdating}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change Role</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onUpdateRole('admin')}>
                <Shield className="h-4 w-4 mr-2" />
                Make Admin
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateRole('member')}>
                <User className="h-4 w-4 mr-2" />
                Make Member
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUpdateRole('viewer')}>
                <User className="h-4 w-4 mr-2" />
                Make Viewer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onRemove}
                className="text-destructive focus:text-destructive"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Remove from Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
