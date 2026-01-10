-- =============================================
-- SLA TRACKING SYSTEM - Complete Implementation
-- =============================================

-- 1. Create SLA Policies Table
CREATE TABLE public.sla_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  -- Time thresholds in minutes
  first_response_target INTEGER NOT NULL DEFAULT 60,
  resolution_target INTEGER NOT NULL DEFAULT 1440,
  -- Warning threshold (percentage of target)
  warning_threshold INTEGER NOT NULL DEFAULT 80,
  -- Priority-specific overrides
  priority_overrides JSONB DEFAULT '{}'::jsonb,
  -- Channel-specific overrides
  channel_overrides JSONB DEFAULT '{}'::jsonb,
  -- Business hours (null = 24/7)
  business_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create SLA Tracking Table
CREATE TABLE public.sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE UNIQUE,
  sla_policy_id UUID REFERENCES public.sla_policies(id) ON DELETE SET NULL,
  -- Timestamps
  first_customer_message_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  -- SLA calculations (in minutes)
  first_response_time INTEGER,
  resolution_time INTEGER,
  -- SLA status
  first_response_breached BOOLEAN DEFAULT false,
  resolution_breached BOOLEAN DEFAULT false,
  first_response_warning_sent BOOLEAN DEFAULT false,
  resolution_warning_sent BOOLEAN DEFAULT false,
  -- Pause tracking
  paused_at TIMESTAMPTZ,
  total_paused_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create SLA Breach Logs Table
CREATE TABLE public.sla_breach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  breach_type TEXT NOT NULL CHECK (breach_type IN ('first_response', 'resolution')),
  target_minutes INTEGER NOT NULL,
  actual_minutes INTEGER NOT NULL,
  assigned_to UUID,
  channel_type channel_type NOT NULL,
  priority priority_level NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable RLS on all tables
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_breach_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for sla_policies
CREATE POLICY "Business members can view SLA policies"
  ON public.sla_policies FOR SELECT
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business owners can insert SLA policies"
  ON public.sla_policies FOR INSERT
  WITH CHECK (is_business_owner(auth.uid(), business_id));

CREATE POLICY "Business owners can update SLA policies"
  ON public.sla_policies FOR UPDATE
  USING (is_business_owner(auth.uid(), business_id));

CREATE POLICY "Business owners can delete SLA policies"
  ON public.sla_policies FOR DELETE
  USING (is_business_owner(auth.uid(), business_id));

-- 6. RLS Policies for sla_tracking
CREATE POLICY "Business members can view SLA tracking"
  ON public.sla_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND (is_business_member(auth.uid(), c.business_id) OR is_admin(auth.uid()))
    )
  );

-- Allow system/triggers to manage tracking (via SECURITY DEFINER functions)
CREATE POLICY "System can manage SLA tracking"
  ON public.sla_tracking FOR ALL
  USING (
    current_setting('role', true) = 'service_role' 
    OR EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND (is_business_member(auth.uid(), c.business_id) OR is_admin(auth.uid()))
    )
  );

-- 7. RLS Policies for sla_breach_logs
CREATE POLICY "Business members can view breach logs"
  ON public.sla_breach_logs FOR SELECT
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

-- System can insert breach logs (via SECURITY DEFINER triggers)
CREATE POLICY "System can insert breach logs"
  ON public.sla_breach_logs FOR INSERT
  WITH CHECK (current_setting('role', true) = 'service_role' OR auth.uid() IS NOT NULL);

-- 8. Indexes for performance
CREATE INDEX idx_sla_policies_business ON public.sla_policies(business_id);
CREATE INDEX idx_sla_policies_default ON public.sla_policies(business_id, is_default) WHERE is_active = true;
CREATE INDEX idx_sla_tracking_conversation ON public.sla_tracking(conversation_id);
CREATE INDEX idx_sla_tracking_breached ON public.sla_tracking(first_response_breached, resolution_breached) WHERE resolved_at IS NULL;
CREATE INDEX idx_sla_breach_logs_business ON public.sla_breach_logs(business_id);
CREATE INDEX idx_sla_breach_logs_conversation ON public.sla_breach_logs(conversation_id);
CREATE INDEX idx_sla_breach_logs_created ON public.sla_breach_logs(created_at DESC);

-- 9. Updated_at triggers
CREATE TRIGGER update_sla_policies_updated_at
  BEFORE UPDATE ON public.sla_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sla_tracking_updated_at
  BEFORE UPDATE ON public.sla_tracking
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Enable realtime for SLA tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.sla_tracking;

-- =============================================
-- SLA TRACKING TRIGGERS AND FUNCTIONS
-- =============================================

-- 11. Function to get effective SLA targets for a conversation
CREATE OR REPLACE FUNCTION public.get_effective_sla_targets(
  p_business_id UUID,
  p_priority priority_level,
  p_channel_type channel_type
)
RETURNS TABLE(
  policy_id UUID,
  first_response_target INTEGER,
  resolution_target INTEGER,
  warning_threshold INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy RECORD;
  v_fr_target INTEGER;
  v_res_target INTEGER;
BEGIN
  -- Get the default active policy for the business
  SELECT * INTO v_policy 
  FROM sla_policies 
  WHERE business_id = p_business_id 
    AND is_active = true 
  ORDER BY is_default DESC 
  LIMIT 1;
  
  IF v_policy IS NULL THEN
    RETURN;
  END IF;
  
  -- Start with base targets
  v_fr_target := v_policy.first_response_target;
  v_res_target := v_policy.resolution_target;
  
  -- Apply priority overrides if exists
  IF v_policy.priority_overrides ? p_priority::text THEN
    v_fr_target := COALESCE(
      (v_policy.priority_overrides -> p_priority::text ->> 'first_response_target')::INTEGER,
      v_fr_target
    );
    v_res_target := COALESCE(
      (v_policy.priority_overrides -> p_priority::text ->> 'resolution_target')::INTEGER,
      v_res_target
    );
  END IF;
  
  -- Apply channel overrides if exists
  IF v_policy.channel_overrides ? p_channel_type::text THEN
    v_fr_target := COALESCE(
      (v_policy.channel_overrides -> p_channel_type::text ->> 'first_response_target')::INTEGER,
      v_fr_target
    );
    v_res_target := COALESCE(
      (v_policy.channel_overrides -> p_channel_type::text ->> 'resolution_target')::INTEGER,
      v_res_target
    );
  END IF;
  
  RETURN QUERY SELECT 
    v_policy.id,
    v_fr_target,
    v_res_target,
    v_policy.warning_threshold;
END;
$$;

-- 12. Trigger function for tracking SLA on new messages
CREATE OR REPLACE FUNCTION public.track_sla_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation RECORD;
  v_tracking RECORD;
  v_policy RECORD;
  v_elapsed_minutes INTEGER;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation FROM conversations WHERE id = NEW.conversation_id;
  
  IF v_conversation IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF NEW.sender_type = 'customer' THEN
    -- Get or create SLA tracking record
    SELECT * INTO v_tracking FROM sla_tracking WHERE conversation_id = NEW.conversation_id;
    
    IF v_tracking IS NULL THEN
      -- Get the default policy for this business
      SELECT * INTO v_policy 
      FROM get_effective_sla_targets(v_conversation.business_id, v_conversation.priority, v_conversation.channel_type);
      
      -- Create new tracking record
      INSERT INTO sla_tracking (
        conversation_id, 
        sla_policy_id,
        first_customer_message_at
      ) VALUES (
        NEW.conversation_id,
        v_policy.policy_id,
        NOW()
      );
    ELSE
      -- Resume tracking if was paused (customer sent another message)
      IF v_tracking.paused_at IS NOT NULL THEN
        UPDATE sla_tracking
        SET 
          total_paused_minutes = total_paused_minutes + EXTRACT(EPOCH FROM (NOW() - paused_at))::INTEGER / 60,
          paused_at = NULL,
          updated_at = NOW()
        WHERE conversation_id = NEW.conversation_id;
      END IF;
    END IF;
    
  ELSIF NEW.sender_type = 'agent' AND NOT NEW.is_internal THEN
    -- Record first response time if not already recorded
    SELECT * INTO v_tracking FROM sla_tracking WHERE conversation_id = NEW.conversation_id;
    
    IF v_tracking IS NOT NULL AND v_tracking.first_response_at IS NULL THEN
      v_elapsed_minutes := EXTRACT(EPOCH FROM (NOW() - v_tracking.first_customer_message_at))::INTEGER / 60 - COALESCE(v_tracking.total_paused_minutes, 0);
      
      UPDATE sla_tracking
      SET 
        first_response_at = NOW(),
        first_response_time = v_elapsed_minutes,
        paused_at = NOW(), -- Pause clock after agent response
        updated_at = NOW()
      WHERE conversation_id = NEW.conversation_id;
    ELSIF v_tracking IS NOT NULL AND v_tracking.paused_at IS NULL THEN
      -- Pause the clock after any agent response
      UPDATE sla_tracking
      SET 
        paused_at = NOW(),
        updated_at = NOW()
      WHERE conversation_id = NEW.conversation_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 13. Trigger for SLA tracking on messages
CREATE TRIGGER trigger_track_sla_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.track_sla_on_message();

-- 14. Trigger function for tracking SLA on resolution
CREATE OR REPLACE FUNCTION public.track_sla_on_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tracking RECORD;
  v_policy RECORD;
  v_elapsed_minutes INTEGER;
BEGIN
  -- Only process when status changes to resolved
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    SELECT * INTO v_tracking FROM sla_tracking WHERE conversation_id = NEW.id;
    
    IF v_tracking IS NOT NULL AND v_tracking.resolved_at IS NULL THEN
      -- Get effective SLA targets
      SELECT * INTO v_policy 
      FROM get_effective_sla_targets(NEW.business_id, NEW.priority, NEW.channel_type);
      
      -- Calculate total resolution time
      v_elapsed_minutes := EXTRACT(EPOCH FROM (NOW() - v_tracking.first_customer_message_at))::INTEGER / 60 
        - COALESCE(v_tracking.total_paused_minutes, 0);
      
      -- Check for resolution breach
      IF v_policy IS NOT NULL AND v_elapsed_minutes > v_policy.resolution_target THEN
        -- Log the breach
        INSERT INTO sla_breach_logs (
          business_id, conversation_id, breach_type, target_minutes, 
          actual_minutes, assigned_to, channel_type, priority
        ) VALUES (
          NEW.business_id, NEW.id, 'resolution', v_policy.resolution_target,
          v_elapsed_minutes, NEW.assigned_to, NEW.channel_type, NEW.priority
        );
        
        -- Update tracking with breach flag
        UPDATE sla_tracking
        SET 
          resolved_at = NOW(),
          resolution_time = v_elapsed_minutes,
          resolution_breached = true,
          updated_at = NOW()
        WHERE conversation_id = NEW.id;
      ELSE
        -- Update tracking without breach
        UPDATE sla_tracking
        SET 
          resolved_at = NOW(),
          resolution_time = v_elapsed_minutes,
          resolution_breached = false,
          updated_at = NOW()
        WHERE conversation_id = NEW.id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 15. Trigger for SLA tracking on conversation resolution
CREATE TRIGGER trigger_track_sla_on_resolution
  AFTER UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.track_sla_on_resolution();

-- 16. Function to check SLA breaches (can be called periodically via cron or edge function)
CREATE OR REPLACE FUNCTION public.check_sla_breaches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tracking RECORD;
  v_policy RECORD;
  v_conversation RECORD;
  v_elapsed_minutes INTEGER;
  v_breaches_found INTEGER := 0;
BEGIN
  -- Loop through all active (unresolved, unpaused) SLA tracking records
  FOR v_tracking IN 
    SELECT st.*, c.business_id, c.assigned_to, c.channel_type, c.priority
    FROM sla_tracking st
    JOIN conversations c ON c.id = st.conversation_id
    WHERE st.resolved_at IS NULL
    AND st.paused_at IS NULL
    AND st.first_customer_message_at IS NOT NULL
  LOOP
    -- Get effective SLA targets for this conversation
    SELECT * INTO v_policy 
    FROM get_effective_sla_targets(v_tracking.business_id, v_tracking.priority, v_tracking.channel_type);
    
    IF v_policy IS NOT NULL THEN
      v_elapsed_minutes := EXTRACT(EPOCH FROM (NOW() - v_tracking.first_customer_message_at))::INTEGER / 60 
        - COALESCE(v_tracking.total_paused_minutes, 0);
      
      -- Check first response breach (if not already responded)
      IF v_tracking.first_response_at IS NULL 
         AND NOT v_tracking.first_response_breached 
         AND v_elapsed_minutes > v_policy.first_response_target THEN
        
        -- Mark as breached
        UPDATE sla_tracking 
        SET first_response_breached = true, updated_at = NOW() 
        WHERE id = v_tracking.id;
        
        -- Log the breach
        INSERT INTO sla_breach_logs (
          business_id, conversation_id, breach_type, target_minutes, 
          actual_minutes, assigned_to, channel_type, priority
        ) VALUES (
          v_tracking.business_id, v_tracking.conversation_id, 'first_response', 
          v_policy.first_response_target, v_elapsed_minutes, 
          v_tracking.assigned_to, v_tracking.channel_type, v_tracking.priority
        );
        
        -- Send notification to assigned user
        IF v_tracking.assigned_to IS NOT NULL THEN
          INSERT INTO notifications (business_id, user_id, type, title, body, data)
          VALUES (
            v_tracking.business_id,
            v_tracking.assigned_to,
            'status_change',
            'SLA Breach: First Response',
            'Response time exceeded ' || v_policy.first_response_target || ' minutes',
            jsonb_build_object(
              'conversation_id', v_tracking.conversation_id, 
              'breach_type', 'first_response',
              'target_minutes', v_policy.first_response_target,
              'actual_minutes', v_elapsed_minutes
            )
          );
        END IF;
        
        v_breaches_found := v_breaches_found + 1;
        
      -- Check warning threshold for first response
      ELSIF v_tracking.first_response_at IS NULL 
         AND NOT v_tracking.first_response_warning_sent 
         AND v_elapsed_minutes > (v_policy.first_response_target * v_policy.warning_threshold / 100) THEN
        
        UPDATE sla_tracking 
        SET first_response_warning_sent = true, updated_at = NOW() 
        WHERE id = v_tracking.id;
        
        IF v_tracking.assigned_to IS NOT NULL THEN
          INSERT INTO notifications (business_id, user_id, type, title, body, data)
          VALUES (
            v_tracking.business_id,
            v_tracking.assigned_to,
            'status_change',
            'SLA Warning: Response Due Soon',
            'SLA breach in ' || (v_policy.first_response_target - v_elapsed_minutes) || ' minutes',
            jsonb_build_object(
              'conversation_id', v_tracking.conversation_id, 
              'warning_type', 'first_response',
              'minutes_remaining', v_policy.first_response_target - v_elapsed_minutes
            )
          );
        END IF;
      END IF;
      
      -- Check resolution warning (if first response done but not resolved)
      IF v_tracking.first_response_at IS NOT NULL 
         AND NOT v_tracking.resolution_warning_sent 
         AND v_elapsed_minutes > (v_policy.resolution_target * v_policy.warning_threshold / 100) THEN
        
        UPDATE sla_tracking 
        SET resolution_warning_sent = true, updated_at = NOW() 
        WHERE id = v_tracking.id;
        
        IF v_tracking.assigned_to IS NOT NULL THEN
          INSERT INTO notifications (business_id, user_id, type, title, body, data)
          VALUES (
            v_tracking.business_id,
            v_tracking.assigned_to,
            'status_change',
            'SLA Warning: Resolution Due Soon',
            'Resolution SLA breach in ' || (v_policy.resolution_target - v_elapsed_minutes) || ' minutes',
            jsonb_build_object(
              'conversation_id', v_tracking.conversation_id, 
              'warning_type', 'resolution',
              'minutes_remaining', v_policy.resolution_target - v_elapsed_minutes
            )
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_breaches_found;
END;
$$;

-- 17. Function to get SLA metrics for analytics
CREATE OR REPLACE FUNCTION public.get_sla_metrics(
  p_business_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE(
  total_conversations BIGINT,
  avg_first_response_minutes NUMERIC,
  avg_resolution_minutes NUMERIC,
  first_response_breach_count BIGINT,
  resolution_breach_count BIGINT,
  first_response_compliance_rate NUMERIC,
  resolution_compliance_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_conversations,
    ROUND(AVG(st.first_response_time)::NUMERIC, 1) as avg_first_response_minutes,
    ROUND(AVG(st.resolution_time)::NUMERIC, 1) as avg_resolution_minutes,
    COUNT(*) FILTER (WHERE st.first_response_breached)::BIGINT as first_response_breach_count,
    COUNT(*) FILTER (WHERE st.resolution_breached)::BIGINT as resolution_breach_count,
    ROUND(
      (COUNT(*) FILTER (WHERE NOT st.first_response_breached AND st.first_response_at IS NOT NULL)::NUMERIC 
       / NULLIF(COUNT(*) FILTER (WHERE st.first_response_at IS NOT NULL), 0) * 100), 
      1
    ) as first_response_compliance_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE NOT st.resolution_breached AND st.resolved_at IS NOT NULL)::NUMERIC 
       / NULLIF(COUNT(*) FILTER (WHERE st.resolved_at IS NOT NULL), 0) * 100), 
      1
    ) as resolution_compliance_rate
  FROM sla_tracking st
  JOIN conversations c ON c.id = st.conversation_id
  WHERE c.business_id = p_business_id
    AND st.created_at BETWEEN p_start_date AND p_end_date;
END;
$$;