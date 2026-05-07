
-- 1. Vision pref persistence: preferences JSONB on user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. Security check runs (internal dashboard)
CREATE TABLE IF NOT EXISTS public.security_check_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type text NOT NULL,                -- 'headers' | 'rpc_roles' | 'storage'
  environment text NOT NULL DEFAULT 'staging',
  status text NOT NULL,                    -- 'pass' | 'fail' | 'warn'
  summary text,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  commit_sha text,
  ran_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_security_check_runs_recent
  ON public.security_check_runs (check_type, created_at DESC);

ALTER TABLE public.security_check_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security check runs"
  ON public.security_check_runs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role inserts security check runs"
  ON public.security_check_runs FOR INSERT
  TO public
  WITH CHECK (current_setting('role', true) = 'service_role');

-- 3. Client-callable audit logger (lets authenticated users record their own
--    sensitive actions without granting INSERT on audit_logs).
CREATE OR REPLACE FUNCTION public.log_user_action(
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_business_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_business uuid := p_business_id;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- If a business is asserted, the caller must belong to it
  IF v_business IS NOT NULL
     AND NOT public.is_business_member(auth.uid(), v_business)
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied for business scope'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_business IS NULL THEN
    SELECT id INTO v_business FROM public.businesses
      WHERE owner_id = auth.uid() LIMIT 1;
  END IF;

  INSERT INTO public.audit_logs (
    user_id, business_id, action, entity_type, entity_id,
    metadata, ip_address
  ) VALUES (
    auth.uid(), v_business, p_action, p_entity_type, p_entity_id,
    COALESCE(p_metadata, '{}'::jsonb), inet_client_addr()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_user_action(text, text, uuid, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_user_action(text, text, uuid, uuid, jsonb) TO authenticated;

-- 4. Allow business owners and admins to view audit_logs scoped to their business
DROP POLICY IF EXISTS "Business owners can view business audit logs" ON public.audit_logs;
CREATE POLICY "Business owners can view business audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    business_id IS NOT NULL
    AND public.is_business_owner(auth.uid(), business_id)
  );
