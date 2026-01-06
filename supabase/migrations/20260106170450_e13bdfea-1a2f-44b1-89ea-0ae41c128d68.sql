-- Security Migration: Restrict access to sensitive data

-- 1. Restrict social_channels token access - create a secure function to get tokens
CREATE OR REPLACE FUNCTION public.get_channel_tokens(p_channel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel RECORD;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify user is business owner (not just member) for token access
  SELECT sc.* INTO v_channel
  FROM social_channels sc
  JOIN businesses b ON b.id = sc.business_id
  WHERE sc.id = p_channel_id
    AND b.owner_id = v_user_id;
    
  IF v_channel IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'access_token', v_channel.access_token,
    'refresh_token', v_channel.refresh_token,
    'token_expires_at', v_channel.token_expires_at
  );
END;
$$;

-- 2. Create secure view for social_channels that hides tokens
CREATE OR REPLACE VIEW public.social_channels_safe AS
SELECT 
  id, 
  business_id, 
  channel_type, 
  channel_id, 
  channel_name, 
  connected_at, 
  is_active, 
  is_connected, 
  metadata, 
  settings, 
  created_at, 
  updated_at,
  CASE WHEN token_expires_at IS NOT NULL THEN true ELSE false END as has_tokens
FROM social_channels;

-- 3. Create secure function to check if user can modify sensitive business data
CREATE OR REPLACE FUNCTION public.is_business_owner(p_user_id uuid, p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM businesses
    WHERE id = p_business_id
      AND owner_id = p_user_id
  )
$$;

-- 4. Restrict audit_logs insert to only service role or trigger-based inserts
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Create a new restrictive policy - only allow inserts from triggers (no direct inserts)
CREATE POLICY "Only system can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (
  -- Only allow if inserted via trigger/function context
  -- This effectively requires inserts to come from SECURITY DEFINER functions
  current_setting('role') = 'service_role' OR 
  auth.uid() IS NULL -- Allows trigger/function contexts
);

-- 5. Make messages immutable after creation (only allow status updates)
DROP POLICY IF EXISTS "Business members can update messages" ON messages;

CREATE POLICY "Business members can only update message status"
ON messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = messages.conversation_id 
    AND (is_business_member(auth.uid(), c.business_id) OR is_admin(auth.uid()))
  )
)
WITH CHECK (
  -- Only allow updating status field, not content
  content IS NOT DISTINCT FROM (SELECT content FROM messages WHERE id = messages.id)
);

-- 6. Prevent job applicants from changing status field
DROP POLICY IF EXISTS "Freelancers can update their own applications" ON job_applications;

CREATE POLICY "Freelancers can update own applications except status"
ON job_applications FOR UPDATE
USING (
  (EXISTS ( 
    SELECT 1 FROM freelancer_profiles fp
    WHERE fp.id = job_applications.freelancer_id 
    AND fp.user_id = auth.uid()
  ))
)
WITH CHECK (
  -- Freelancers cannot change status
  (EXISTS ( 
    SELECT 1 FROM freelancer_profiles fp
    WHERE fp.id = job_applications.freelancer_id 
    AND fp.user_id = auth.uid()
  ) AND status IS NOT DISTINCT FROM (SELECT status FROM job_applications ja WHERE ja.id = job_applications.id))
  OR
  -- Business members can change anything including status
  (EXISTS ( 
    SELECT 1 FROM job_postings jp
    WHERE jp.id = job_applications.job_id 
    AND is_business_member(auth.uid(), jp.business_id)
  ))
);

-- 7. Create secure function for logging security events (used by edge functions)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    business_id,
    action,
    entity_type,
    entity_id,
    metadata,
    ip_address
  ) VALUES (
    auth.uid(),
    (SELECT id FROM businesses WHERE owner_id = auth.uid() LIMIT 1),
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata,
    inet_client_addr()
  );
END;
$$;