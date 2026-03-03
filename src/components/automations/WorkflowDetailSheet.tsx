import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ArrowDown, Mail, Clock, GitBranch, MessageSquare, Zap } from 'lucide-react';
import type { Workflow, WorkflowStep, WorkflowExecution } from '@/hooks/useAutomationWorkflows';
import { formatDistanceToNow, format } from 'date-fns';

const stepIcons: Record<string, typeof Mail> = {
  send_message: MessageSquare,
  send_email: Mail,
  wait: Clock,
  condition: GitBranch,
  action: Zap,
};

interface Props {
  workflow: Workflow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fetchSteps: (workflowId: string) => Promise<WorkflowStep[]>;
  fetchExecutions: (workflowId: string) => Promise<WorkflowExecution[]>;
}

export function WorkflowDetailSheet({ workflow, open, onOpenChange, fetchSteps, fetchExecutions }: Props) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);

  useEffect(() => {
    if (workflow && open) {
      setLoadingSteps(true);
      Promise.all([
        fetchSteps(workflow.id),
        fetchExecutions(workflow.id),
      ]).then(([s, e]) => {
        setSteps(s);
        setExecutions(e);
      }).finally(() => setLoadingSteps(false));
    }
  }, [workflow?.id, open]);

  if (!workflow) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{workflow.name}</SheetTitle>
          <SheetDescription>{workflow.description || 'No description'}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3">
            <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
              {workflow.is_active ? 'Active' : 'Paused'}
            </Badge>
            <span className="text-sm text-muted-foreground">{workflow.run_count || 0} total runs</span>
          </div>

          <Separator />

          {/* Steps */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Workflow Steps</h3>
            {loadingSteps ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : steps.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No steps configured yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Steps define what happens when this workflow runs.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, idx) => {
                  const Icon = stepIcons[step.step_type] || Zap;
                  return (
                    <div key={step.id}>
                      <Card className="p-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{step.name || step.step_type}</p>
                          <p className="text-xs text-muted-foreground capitalize">{step.step_type.replace('_', ' ')}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          Step {step.step_order}
                        </Badge>
                      </Card>
                      {idx < steps.length - 1 && (
                        <div className="flex justify-center py-1">
                          <ArrowDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Recent Executions */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Recent Runs</h3>
            {executions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No execution history yet.</p>
            ) : (
              <div className="space-y-2">
                {executions.slice(0, 10).map(exec => (
                  <div key={exec.id} className="flex items-center justify-between p-2 rounded-md border text-sm">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={exec.status === 'completed' ? 'default' : exec.status === 'running' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {exec.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        Step {exec.current_step}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(exec.started_at), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
