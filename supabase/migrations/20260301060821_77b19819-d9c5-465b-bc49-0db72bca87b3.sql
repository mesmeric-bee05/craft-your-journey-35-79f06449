
-- Customer Segments table for dynamic groupings
CREATE TABLE public.customer_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_dynamic BOOLEAN DEFAULT true,
  customer_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automation Workflows table
CREATE TABLE public.automation_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'event', 'segment_entry')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workflow Steps table
CREATE TABLE public.workflow_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('send_sms', 'send_email', 'wait', 'condition', 'update_customer', 'add_tag', 'remove_tag', 'webhook')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, step_order)
);

-- Workflow Executions table
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  current_step INTEGER DEFAULT 1,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  next_step_at TIMESTAMP WITH TIME ZONE
);

-- Segment Customers junction table
CREATE TABLE public.segment_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  segment_id UUID NOT NULL REFERENCES public.customer_segments(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(segment_id, customer_id)
);

-- Enable RLS
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_segments
CREATE POLICY "Business members can view segments"
  ON public.customer_segments FOR SELECT
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business owners can manage segments"
  ON public.customer_segments FOR ALL
  USING (is_business_owner(auth.uid(), business_id) OR is_admin(auth.uid()));

-- RLS Policies for automation_workflows
CREATE POLICY "Business members can view workflows"
  ON public.automation_workflows FOR SELECT
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business owners can manage workflows"
  ON public.automation_workflows FOR ALL
  USING (is_business_owner(auth.uid(), business_id) OR is_admin(auth.uid()));

-- RLS Policies for workflow_steps
CREATE POLICY "Business members can view workflow steps"
  ON public.workflow_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM automation_workflows w
    WHERE w.id = workflow_steps.workflow_id
    AND (is_business_member(auth.uid(), w.business_id) OR is_admin(auth.uid()))
  ));

CREATE POLICY "Business owners can manage workflow steps"
  ON public.workflow_steps FOR ALL
  USING (EXISTS (
    SELECT 1 FROM automation_workflows w
    WHERE w.id = workflow_steps.workflow_id
    AND (is_business_owner(auth.uid(), w.business_id) OR is_admin(auth.uid()))
  ));

-- RLS Policies for workflow_executions
CREATE POLICY "Business members can view executions"
  ON public.workflow_executions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM automation_workflows w
    WHERE w.id = workflow_executions.workflow_id
    AND (is_business_member(auth.uid(), w.business_id) OR is_admin(auth.uid()))
  ));

CREATE POLICY "System can manage executions"
  ON public.workflow_executions FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- RLS Policies for segment_customers
CREATE POLICY "Business members can view segment customers"
  ON public.segment_customers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM customer_segments s
    WHERE s.id = segment_customers.segment_id
    AND (is_business_member(auth.uid(), s.business_id) OR is_admin(auth.uid()))
  ));

CREATE POLICY "Business owners can manage segment customers"
  ON public.segment_customers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM customer_segments s
    WHERE s.id = segment_customers.segment_id
    AND (is_business_owner(auth.uid(), s.business_id) OR is_admin(auth.uid()))
  ));

-- Indexes
CREATE INDEX idx_customer_segments_business ON public.customer_segments(business_id);
CREATE INDEX idx_automation_workflows_business ON public.automation_workflows(business_id);
CREATE INDEX idx_workflow_steps_workflow ON public.workflow_steps(workflow_id);
CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_executions_next_step ON public.workflow_executions(next_step_at) WHERE status = 'running';
CREATE INDEX idx_segment_customers_segment ON public.segment_customers(segment_id);

-- Triggers
CREATE TRIGGER update_customer_segments_updated_at
  BEFORE UPDATE ON public.customer_segments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_workflows_updated_at
  BEFORE UPDATE ON public.automation_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_steps_updated_at
  BEFORE UPDATE ON public.workflow_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
