import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_type: string;
  step_order: number;
  name: string | null;
  config: Record<string, unknown>;
  created_at: string;
}

export interface Workflow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  is_active: boolean;
  run_count: number;
  last_run_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  steps?: WorkflowStep[];
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  customer_id: string | null;
  status: string;
  current_step: number;
  context: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

interface UseAutomationWorkflowsReturn {
  workflows: Workflow[];
  loading: boolean;
  createWorkflow: (data: { name: string; description?: string; trigger_type: string; trigger_config?: Record<string, unknown> }) => Promise<string | null>;
  updateWorkflow: (id: string, data: Partial<Workflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  toggleWorkflow: (id: string, active: boolean) => Promise<void>;
  addStep: (workflowId: string, step: { step_type: string; name: string; step_order: number; config?: Record<string, unknown> }) => Promise<void>;
  deleteStep: (stepId: string) => Promise<void>;
  fetchSteps: (workflowId: string) => Promise<WorkflowStep[]>;
  fetchExecutions: (workflowId: string) => Promise<WorkflowExecution[]>;
  refetch: () => Promise<void>;
}

export function useAutomationWorkflows(): UseAutomationWorkflowsReturn {
  const { business } = useBusiness();
  const { user } = useAuth();
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = useCallback(async () => {
    if (!business?.id) {
      setWorkflows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkflows((data || []) as Workflow[]);
    } catch (err: any) {
      toast({ title: 'Error loading workflows', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [business?.id, toast]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const createWorkflow = async (data: { name: string; description?: string; trigger_type: string; trigger_config?: Record<string, unknown> }): Promise<string | null> => {
    if (!business?.id || !user?.id) return null;
    const { data: result, error } = await supabase
      .from('automation_workflows')
      .insert([{
        business_id: business.id,
        created_by: user.id,
        name: data.name,
        description: data.description || null,
        trigger_type: data.trigger_type,
        trigger_config: (data.trigger_config || {}) as any,
      }] as any)
      .select('id')
      .single();

    if (error) {
      toast({ title: 'Error creating workflow', description: error.message, variant: 'destructive' });
      return null;
    }
    toast({ title: 'Workflow created' });
    fetchWorkflows();
    return result.id;
  };

  const updateWorkflow = async (id: string, data: Partial<Workflow>) => {
    const { error } = await supabase.from('automation_workflows').update(data as any).eq('id', id);
    if (error) {
      toast({ title: 'Error updating workflow', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Workflow updated' });
    fetchWorkflows();
  };

  const deleteWorkflow = async (id: string) => {
    const { error } = await supabase.from('automation_workflows').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting workflow', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Workflow deleted' });
    fetchWorkflows();
  };

  const toggleWorkflow = async (id: string, active: boolean) => {
    const { error } = await supabase.from('automation_workflows').update({ is_active: active }).eq('id', id);
    if (error) {
      toast({ title: 'Error toggling workflow', variant: 'destructive' });
      return;
    }
    toast({ title: active ? 'Workflow activated' : 'Workflow paused' });
    fetchWorkflows();
  };

  const addStep = async (workflowId: string, step: { step_type: string; name: string; step_order: number; config?: Record<string, unknown> }) => {
    const { error } = await supabase.from('workflow_steps').insert([{
      workflow_id: workflowId,
      step_type: step.step_type,
      name: step.name,
      step_order: step.step_order,
      config: (step.config || {}) as any,
    }] as any);
    if (error) {
      toast({ title: 'Error adding step', description: error.message, variant: 'destructive' });
    }
  };

  const deleteStep = async (stepId: string) => {
    const { error } = await supabase.from('workflow_steps').delete().eq('id', stepId);
    if (error) {
      toast({ title: 'Error deleting step', description: error.message, variant: 'destructive' });
    }
  };

  const fetchSteps = async (workflowId: string): Promise<WorkflowStep[]> => {
    const { data, error } = await supabase
      .from('workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('step_order', { ascending: true });
    if (error) return [];
    return (data || []) as WorkflowStep[];
  };

  const fetchExecutions = async (workflowId: string): Promise<WorkflowExecution[]> => {
    const { data, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return (data || []) as WorkflowExecution[];
  };

  return {
    workflows,
    loading,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    addStep,
    deleteStep,
    fetchSteps,
    fetchExecutions,
    refetch: fetchWorkflows,
  };
}
