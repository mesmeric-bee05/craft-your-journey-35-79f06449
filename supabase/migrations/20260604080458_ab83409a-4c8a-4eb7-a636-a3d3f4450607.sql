
CREATE TABLE public.cron_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running','success','failure')),
  rows_affected integer,
  duration_ms integer,
  error_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cron_job_runs_job_started ON public.cron_job_runs(job_name, started_at DESC);

GRANT SELECT ON public.cron_job_runs TO authenticated;
GRANT ALL ON public.cron_job_runs TO service_role;

ALTER TABLE public.cron_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron job runs"
  ON public.cron_job_runs FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_cron_health()
RETURNS TABLE(
  job_name text,
  last_run_at timestamptz,
  last_success_at timestamptz,
  last_status text,
  last_duration_ms integer,
  last_error text,
  minutes_since_success numeric,
  expected_interval_minutes integer,
  is_stale boolean
)
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
      ('security-rescan-runner', 6*60)
  ),
  latest AS (
    SELECT DISTINCT ON (r.job_name) r.job_name, r.started_at, r.status, r.duration_ms, r.error_text
    FROM public.cron_job_runs r
    ORDER BY r.job_name, r.started_at DESC
  ),
  latest_success AS (
    SELECT DISTINCT ON (r.job_name) r.job_name, r.started_at AS success_at
    FROM public.cron_job_runs r
    WHERE r.status = 'success'
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

REVOKE ALL ON FUNCTION public.get_cron_health() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_cron_health() TO authenticated, service_role;
