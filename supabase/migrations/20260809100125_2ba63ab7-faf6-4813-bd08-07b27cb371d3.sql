ALTER TABLE public.cron_job_runs DROP CONSTRAINT IF EXISTS cron_job_runs_status_check;
ALTER TABLE public.cron_job_runs ADD CONSTRAINT cron_job_runs_status_check
  CHECK (status = ANY (ARRAY['running'::text, 'success'::text, 'failure'::text, 'skipped'::text]));

CREATE OR REPLACE FUNCTION public.get_cron_health()
RETURNS TABLE(job_name text, last_run_at timestamp with time zone, last_success_at timestamp with time zone, last_status text, last_duration_ms integer, last_error text, minutes_since_success numeric, expected_interval_minutes integer, is_stale boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE='insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH jobs(name, interval_min) AS (
    VALUES
      ('snapshot-health-scores', 24*60),
      ('security-rescan-runner', 6*60),
      ('gsc-submit-sitemap', 24*60),
      ('seo-route-audit', 24*60)
  ),
  latest AS (
    SELECT DISTINCT ON (r.job_name) r.job_name, r.started_at, r.status, r.duration_ms, r.error_text
    FROM public.cron_job_runs r
    ORDER BY r.job_name, r.started_at DESC
  ),
  latest_success AS (
    SELECT DISTINCT ON (r.job_name) r.job_name, r.started_at AS success_at
    FROM public.cron_job_runs r
    WHERE r.status IN ('success', 'skipped')
    ORDER BY r.job_name, r.started_at DESC
  )
  SELECT
    j.name,
    l.started_at,
    s.success_at,
    l.status,
    l.duration_ms,
    l.error_text,
    EXTRACT(EPOCH FROM (now() - s.success_at))/60,
    j.interval_min,
    (s.success_at IS NULL OR (now() - s.success_at) > (j.interval_min * interval '1.5 minute'))
  FROM jobs j
  LEFT JOIN latest l ON l.job_name = j.name
  LEFT JOIN latest_success s ON s.job_name = j.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.security_scan_table_report()
RETURNS TABLE(table_name text, rls_enabled boolean, anon_readable boolean, policy_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.relname::text,
    c.relrowsecurity,
    EXISTS (
      SELECT 1 FROM pg_policy p
      WHERE p.polrelid = c.oid
        AND (p.polroles = '{0}'::oid[] OR 'anon' = ANY (SELECT rolname FROM pg_roles WHERE oid = ANY (p.polroles)))
        AND p.polcmd IN ('r', '*')
    ),
    (SELECT count(*)::int FROM pg_policy p2 WHERE p2.polrelid = c.oid)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r';
$$;

REVOKE ALL ON FUNCTION public.security_scan_table_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.security_scan_table_report() TO service_role;