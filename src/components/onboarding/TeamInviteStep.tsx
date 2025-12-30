import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mail, Plus, Trash2, Users } from 'lucide-react';
import type { TeamMember } from '@/hooks/useOnboarding';

interface TeamInviteStepProps {
  members: TeamMember[];
  onAdd: (member: TeamMember) => void;
  onRemove: (email: string) => void;
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const roles = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'manager', label: 'Manager', description: 'Manage content and team' },
  { value: 'member', label: 'Member', description: 'Basic access' },
];

export function TeamInviteStep({
  members,
  onAdd,
  onRemove,
  onComplete,
  onBack,
  isLoading,
}: TeamInviteStepProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'member'>('member');

  const handleAdd = () => {
    if (!email || !email.includes('@')) return;
    if (members.some((m) => m.email === email)) return;

    onAdd({ email, role });
    setEmail('');
    setRole('member');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'manager':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Invite Team Members
          </CardTitle>
          <CardDescription>
            Add team members to help manage your business. You can skip this step and invite them later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
            </div>
            <div className="w-full md:w-40 space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={!email || !email.includes('@')}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Invited Members List */}
          {members.length > 0 && (
            <div className="space-y-3">
              <Label>Pending Invitations ({members.length})</Label>
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.email}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.email}</p>
                        <Badge variant={getRoleBadgeVariant(member.role)} className="mt-1">
                          {roles.find((r) => r.value === member.role)?.label}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onRemove(member.email)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Role Descriptions */}
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm font-medium mb-3">Role Permissions</p>
            <div className="space-y-2">
              {roles.map((r) => (
                <div key={r.value} className="flex items-start gap-2 text-sm">
                  <Badge variant={getRoleBadgeVariant(r.value)} className="mt-0.5">
                    {r.label}
                  </Badge>
                  <span className="text-muted-foreground">{r.description}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onComplete} disabled={isLoading}>
            Skip for Now
          </Button>
          <Button onClick={onComplete} disabled={isLoading} size="lg">
            {isLoading ? 'Completing...' : members.length > 0 ? 'Send Invites & Complete' : 'Complete Setup'}
          </Button>
        </div>
      </div>
    </div>
  );
}
