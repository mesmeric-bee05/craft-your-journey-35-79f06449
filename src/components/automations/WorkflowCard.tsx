import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Play, Pause, Trash2, Eye, Zap, Clock, Users, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Workflow } from '@/hooks/useAutomationWorkflows';

const triggerIcons: Record<string, typeof Zap> = {
  manual: Play,
  scheduled: Calendar,
  event: Zap,
  segment_entry: Users,
};

const triggerLabels: Record<string, string> = {
  manual: 'Manual',
  scheduled: 'Scheduled',
  event: 'Event-based',
  segment_entry: 'Segment Entry',
};

interface Props {
  workflow: Workflow;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onView: (workflow: Workflow) => void;
}

export function WorkflowCard({ workflow, onToggle, onDelete, onView }: Props) {
  const TriggerIcon = triggerIcons[workflow.trigger_type] || Zap;

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TriggerIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{workflow.name}</CardTitle>
              {workflow.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{workflow.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={workflow.is_active}
              onCheckedChange={(checked) => onToggle(workflow.id, checked)}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(workflow)}>
                  <Eye className="h-4 w-4 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(workflow.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
            {workflow.is_active ? 'Active' : 'Paused'}
          </Badge>
          <Badge variant="outline">
            {triggerLabels[workflow.trigger_type] || workflow.trigger_type}
          </Badge>
          <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
            <Play className="h-3 w-3" />
            <span>{workflow.run_count || 0} runs</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>Created {formatDistanceToNow(new Date(workflow.created_at), { addSuffix: true })}</span>
          {workflow.last_run_at && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last run {formatDistanceToNow(new Date(workflow.last_run_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
