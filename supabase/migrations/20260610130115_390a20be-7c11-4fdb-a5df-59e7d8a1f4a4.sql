
-- Rate limit table for admin actions
CREATE TABLE public.admin_action_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key text NOT NULL,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  invocation_count integer NOT NULL DEFAULT 0,
  last_invoked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, action_key)
);

GRANT ALL ON public.admin_action_rate_limits TO service_role;
-- Intentionally no grant to authenticated; only service-role (via SECURITY DEFINER RPC) manages rows.

ALTER TABLE public.admin_action_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages rate limits"
  ON public.admin_action_rate_limits FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_admin_rate_limits_user_action ON public.admin_action_rate_limits (user_id, action_key);

-- Atomic check-and-record. Raises 'rate_limit_exceeded' with SQLSTATE P0001 when over quota.
CREATE OR REPLACE FUNCTION public.check_and_record_admin_action(
  p_action text,
  p_max_per_hour integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row record;
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'admin required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.admin_action_rate_limits (user_id, action_key, window_started_at, invocation_count, last_invoked_at)
  VALUES (v_uid, p_action, v_now, 1, v_now)
  ON CONFLICT (user_id, action_key) DO UPDATE
    SET invocation_count = CASE
          WHEN public.admin_action_rate_limits.window_started_at < (v_now - interval '1 hour')
            THEN 1
          ELSE public.admin_action_rate_limits.invocation_count + 1
        END,
        window_started_at = CASE
          WHEN public.admin_action_rate_limits.window_started_at < (v_now - interval '1 hour')
            THEN v_now
          ELSE public.admin_action_rate_limits.window_started_at
        END,
        last_invoked_at = v_now,
        updated_at = v_now
  RETURNING * INTO v_row;

  IF v_row.invocation_count > p_max_per_hour THEN
    RAISE EXCEPTION 'rate_limit_exceeded'
      USING ERRCODE = 'P0001',
        DETAIL = jsonb_build_object(
          'action', p_action,
          'max_per_hour', p_max_per_hour,
          'window_started_at', v_row.window_started_at,
          'retry_after_seconds', GREATEST(1, EXTRACT(EPOCH FROM (v_row.window_started_at + interval '1 hour' - v_now))::int)
        )::text;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'invocation_count', v_row.invocation_count,
    'max_per_hour', p_max_per_hour,
    'window_started_at', v_row.window_started_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_record_admin_action(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_and_record_admin_action(text, integer) TO authenticated, service_role;

-- Admin-only timeline RPC for cron runs
CREATE OR REPLACE FUNCTION public.get_cron_runs_timeline(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_job_name text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_since timestamptz DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  job_name text,
  started_at timestamptz,
  finished_at timestamptz,
  status text,
  rows_affected integer,
  duration_ms integer,
  error_text text,
  metadata jsonb,
  total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT r.*
    FROM public.cron_job_runs r
    WHERE (p_job_name IS NULL OR r.job_name = p_job_name)
      AND (p_status IS NULL OR r.status = p_status)
      AND (p_since IS NULL OR r.started_at >= p_since)
      AND (p_search IS NULL OR p_search = ''
           OR r.job_name ILIKE '%' || p_search || '%'
           OR COALESCE(r.error_text, '') ILIKE '%' || p_search || '%')
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS tc FROM filtered
  )
  SELECT f.id, f.job_name, f.started_at, f.finished_at, f.status,
         f.rows_affected, f.duration_ms, f.error_text, f.metadata,
         (SELECT tc FROM counted)
  FROM filtered f
  ORDER BY f.started_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 500))
  OFFSET GREATEST(0, p_offset);
END;
$$;

REVOKE ALL ON FUNCTION public.get_cron_runs_timeline(integer, integer, text, text, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cron_runs_timeline(integer, integer, text, text, timestamptz, text) TO authenticated, service_role;
