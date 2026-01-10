import { Clock, Edit2, Star, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SLAPolicy } from '@/hooks/useSLAPolicies';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SLAPolicyCardProps {
  policy: SLAPolicy;
  onEdit: (policy: SLAPolicy) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export function SLAPolicyCard({ 
  policy, 
  onEdit, 
  onDelete, 
  onSetDefault, 
  onToggleActive 
}: SLAPolicyCardProps) {
  const hasPriorityOverrides = Object.keys(policy.priority_overrides || {}).length > 0;
  const hasChannelOverrides = Object.keys(policy.channel_overrides || {}).length > 0;

  return (
    <Card className={!policy.is_active ? 'opacity-60' : ''}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            {policy.name}
            {policy.is_default && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Default
              </Badge>
            )}
            {!policy.is_active && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Inactive
              </Badge>
            )}
          </CardTitle>
          {policy.description && (
            <p className="text-sm text-muted-foreground">{policy.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleActive(policy.id, !policy.is_active)}
            title={policy.is_active ? 'Deactivate' : 'Activate'}
          >
            {policy.is_active ? (
              <ToggleRight className="h-4 w-4 text-primary" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(policy)}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete SLA Policy</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{policy.name}"? This action cannot be undone.
                  Existing SLA tracking records will retain their data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(policy.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              First Response
            </div>
            <div className="text-2xl font-bold">
              {formatMinutes(policy.first_response_target)}
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Resolution
            </div>
            <div className="text-2xl font-bold">
              {formatMinutes(policy.resolution_target)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Warning at {policy.warning_threshold}% of target</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasPriorityOverrides && (
            <Badge variant="outline" className="text-xs">
              Priority overrides
            </Badge>
          )}
          {hasChannelOverrides && (
            <Badge variant="outline" className="text-xs">
              Channel overrides
            </Badge>
          )}
          {policy.business_hours?.enabled && (
            <Badge variant="outline" className="text-xs">
              Business hours
            </Badge>
          )}
        </div>

        {!policy.is_default && policy.is_active && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSetDefault(policy.id)}
            className="w-full"
          >
            <Star className="h-4 w-4 mr-2" />
            Set as Default
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
