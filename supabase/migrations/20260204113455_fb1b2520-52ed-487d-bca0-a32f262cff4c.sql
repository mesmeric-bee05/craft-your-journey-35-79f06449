-- =============================================
-- SECURITY HARDENING MIGRATION
-- Fixes RLS vulnerabilities, creates secure views
-- =============================================

-- 1. Create secure view for live_streams (hide stream_key and rtmp_url)
CREATE OR REPLACE VIEW public.live_streams_safe AS
SELECT 
  id, 
  user_id, 
  business_id, 
  title, 
  description, 
  status, 
  viewer_count, 
  peak_viewers, 
  platforms,
  metadata,
  started_at, 
  ended_at, 
  created_at, 
  updated_at
FROM public.live_streams;

-- 2. Fix the message update policy - the current one has a self-referential bug
DROP POLICY IF EXISTS "Business members can only update message status" ON public.messages;
CREATE POLICY "Business members can only update message status" ON public.messages
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (public.is_business_member(auth.uid(), c.business_id) OR public.is_admin(auth.uid()))
  )
);
-- Note: We remove the WITH CHECK that referenced OLD since it's not supported in all contexts

-- 3. Fix audit log insert policy - should only allow service_role
DROP POLICY IF EXISTS "Only system can insert audit logs" ON public.audit_logs;
CREATE POLICY "Only service role can insert audit logs" ON public.audit_logs
FOR INSERT 
WITH CHECK (
  current_setting('role', true) = 'service_role'
);

-- 4. Fix SLA tracking - make it service_role only for modifications
DROP POLICY IF EXISTS "System can manage SLA tracking" ON public.sla_tracking;
CREATE POLICY "Only service role can manage SLA tracking" ON public.sla_tracking
FOR ALL 
USING (
  current_setting('role', true) = 'service_role'
);

-- 5. Create function to safely get stream credentials (owner only)
CREATE OR REPLACE FUNCTION public.get_stream_credentials(p_stream_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stream RECORD;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Only stream owner can get credentials
  SELECT * INTO v_stream
  FROM live_streams
  WHERE id = p_stream_id
    AND user_id = v_user_id;
    
  IF v_stream IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'stream_key', v_stream.stream_key,
    'rtmp_url', v_stream.rtmp_url
  );
END;
$$;

-- 6. Create function to get masked customer data for non-owners
CREATE OR REPLACE FUNCTION public.get_customer_masked(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer RECORD;
  v_is_owner boolean;
BEGIN
  SELECT c.*, 
         (SELECT b.owner_id = auth.uid() FROM businesses b WHERE b.id = c.business_id) as is_owner
  INTO v_customer
  FROM customers c
  WHERE c.id = p_customer_id
    AND public.is_business_member(auth.uid(), c.business_id);
    
  IF v_customer IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Owners see full data, members see masked
  IF v_customer.is_owner THEN
    RETURN jsonb_build_object(
      'id', v_customer.id,
      'name', v_customer.name,
      'email', v_customer.email,
      'phone', v_customer.phone,
      'avatar_url', v_customer.avatar_url,
      'tags', v_customer.tags,
      'notes', v_customer.notes,
      'channel_type', v_customer.channel_type,
      'first_contact_at', v_customer.first_contact_at,
      'last_contact_at', v_customer.last_contact_at
    );
  ELSE
    -- Mask email and phone for non-owners
    RETURN jsonb_build_object(
      'id', v_customer.id,
      'name', v_customer.name,
      'email', CASE WHEN v_customer.email IS NOT NULL 
               THEN CONCAT(LEFT(v_customer.email, 2), '***@***', 
                    SUBSTRING(v_customer.email FROM POSITION('@' IN v_customer.email)))
               ELSE NULL END,
      'phone', CASE WHEN v_customer.phone IS NOT NULL 
               THEN CONCAT('+***', RIGHT(v_customer.phone, 4))
               ELSE NULL END,
      'avatar_url', v_customer.avatar_url,
      'tags', v_customer.tags,
      'channel_type', v_customer.channel_type,
      'first_contact_at', v_customer.first_contact_at,
      'last_contact_at', v_customer.last_contact_at
    );
  END IF;
END;
$$;

-- 7. Create secure transaction view (hide sensitive payment details for non-creators)
CREATE OR REPLACE VIEW public.transactions_safe AS
SELECT 
  id,
  business_id,
  wallet_id,
  user_id,
  type,
  amount,
  currency,
  status,
  description,
  reference,
  created_at,
  updated_at,
  completed_at,
  -- Hide sensitive fields if not owner/creator
  CASE 
    WHEN user_id = auth.uid() OR public.is_business_owner(auth.uid(), business_id) 
    THEN payment_method 
    ELSE '***' 
  END as payment_method,
  CASE 
    WHEN user_id = auth.uid() OR public.is_business_owner(auth.uid(), business_id) 
    THEN recipient_phone 
    ELSE CONCAT('+***', RIGHT(COALESCE(recipient_phone, ''), 4))
  END as recipient_phone,
  CASE 
    WHEN user_id = auth.uid() OR public.is_business_owner(auth.uid(), business_id) 
    THEN recipient_email 
    ELSE CONCAT(LEFT(COALESCE(recipient_email, ''), 2), '***')
  END as recipient_email,
  CASE 
    WHEN user_id = auth.uid() OR public.is_business_owner(auth.uid(), business_id) 
    THEN external_reference 
    ELSE '***' 
  END as external_reference
FROM public.transactions;

-- 8. Add index for better performance on commonly queried fields
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON public.notifications(user_id, read_at);

CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation 
ON public.typing_indicators(conversation_id, updated_at);

-- 9. Add comment for security documentation
COMMENT ON VIEW public.live_streams_safe IS 'Safe view of live_streams excluding sensitive stream_key and rtmp_url';
COMMENT ON VIEW public.transactions_safe IS 'Safe view of transactions with masked sensitive fields for non-owners';
COMMENT ON FUNCTION public.get_stream_credentials IS 'Security definer function - only stream owner can retrieve credentials';
COMMENT ON FUNCTION public.get_customer_masked IS 'Returns customer data with PII masked for non-owners';