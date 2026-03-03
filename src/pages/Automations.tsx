import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Zap, RefreshCw } from 'lucide-react';
import { useAutomationWorkflows, type Workflow } from '@/hooks/useAutomationWorkflows';
import { WorkflowCard } from '@/components/automations/WorkflowCard';
import { CreateWorkflowDialog } from '@/components/automations/CreateWorkflowDialog';
import { WorkflowDetailSheet } from '@/components/automations/WorkflowDetailSheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Automations() {
  const {
    workflows, loading, createWorkflow, deleteWorkflow,
    toggleWorkflow, fetchSteps, fetchExecutions, refetch,
  } = useAutomationWorkflows();

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleView = (w: Workflow) => {
    setSelectedWorkflow(w);
    setDetailOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteId) {
      await deleteWorkflow(deleteId);
      setDeleteId(null);
    }
  };

  const activeCount = workflows.filter(w => w.is_active).length;
  const totalRuns = workflows.reduce((sum, w) => sum + (w.run_count || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Zap className="h-8 w-8 text-accent" />
              Automations
            </h1>
            <p className="text-muted-foreground mt-1">
              Build automated workflows to streamline your business operations
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button className="gap-2 bg-gradient-accent text-white" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New Automation
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">Total Workflows</p>
            <p className="text-2xl font-bold text-foreground">{workflows.length}</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-success">{activeCount}</p>
          </div>
          <div className="p-4 rounded-lg border bg-card">
            <p className="text-sm text-muted-foreground">Total Runs</p>
            <p className="text-2xl font-bold text-primary">{totalRuns}</p>
          </div>
        </div>

        {/* Workflow List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-6 rounded-xl border bg-card space-y-3">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-xl">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No automations yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md mx-auto">
              Create your first automation to streamline repetitive tasks like welcoming new customers,
              sending follow-ups, or triggering campaigns.
            </p>
            <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Automation
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map(workflow => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onToggle={toggleWorkflow}
                onDelete={(id) => setDeleteId(id)}
                onView={handleView}
              />
            ))}
          </div>
        )}
      </div>

      <CreateWorkflowDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createWorkflow}
      />

      <WorkflowDetailSheet
        workflow={selectedWorkflow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        fetchSteps={fetchSteps}
        fetchExecutions={fetchExecutions}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this workflow and all its steps.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
