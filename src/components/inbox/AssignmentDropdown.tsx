import { useState } from 'react';
import { Check, ChevronsUpDown, UserCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamMembers, TeamMember } from '@/hooks/useTeamMembers';
import { cn } from '@/lib/utils';

interface AssignmentDropdownProps {
  currentAssignee: string | null;
  onAssign: (userId: string | null) => void;
  disabled?: boolean;
}

export function AssignmentDropdown({ currentAssignee, onAssign, disabled }: AssignmentDropdownProps) {
  const [open, setOpen] = useState(false);
  const { members, loading } = useTeamMembers();

  const currentMember = members.find(m => m.user_id === currentAssignee);
  const displayName = currentMember?.profile?.full_name || currentMember?.profile?.email || 'Unassigned';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSelect = (member: TeamMember | null) => {
    onAssign(member?.user_id || null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
          disabled={disabled || loading}
        >
          <div className="flex items-center gap-2 truncate">
            {currentAssignee ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={currentMember?.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="truncate">{displayName}</span>
              </>
            ) : (
              <>
                <UserCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Unassigned</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search team members..." />
          <CommandList>
            <CommandEmpty>No team members found.</CommandEmpty>
            <CommandGroup>
              {/* Unassign option */}
              <CommandItem
                onSelect={() => handleSelect(null)}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                <span>Unassign</span>
                {!currentAssignee && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </CommandItem>
              
              {/* Team members */}
              {members.map((member) => {
                const name = member.profile?.full_name || member.profile?.email || 'Unknown';
                const memberInitials = name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <CommandItem
                    key={member.id}
                    onSelect={() => handleSelect(member)}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={member.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{memberInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                      <span className={cn(
                        member.role === 'owner' && 'font-medium'
                      )}>
                        {name}
                      </span>
                      {member.role === 'owner' && (
                        <span className="ml-1 text-xs text-muted-foreground">(Owner)</span>
                      )}
                    </div>
                    {currentAssignee === member.user_id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
