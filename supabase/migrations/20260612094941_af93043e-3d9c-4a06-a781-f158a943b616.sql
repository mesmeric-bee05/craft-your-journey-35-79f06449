
-- SEO audit runs
CREATE TABLE public.seo_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running','success','failure')),
  total_routes integer NOT NULL DEFAULT 0,
  failing_routes integer NOT NULL DEFAULT 0,
  total_findings integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.seo_audit_runs TO service_role;
ALTER TABLE public.seo_audit_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read seo_audit_runs" ON public.seo_audit_runs
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX idx_seo_audit_runs_started ON public.seo_audit_runs (started_at DESC);

-- Findings
CREATE TABLE public.seo_audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.seo_audit_runs(id) ON DELETE CASCADE,
  route text NOT NULL,
  check_name text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info','warn','error')),
  message text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.seo_audit_findings TO service_role;
ALTER TABLE public.seo_audit_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read seo_audit_findings" ON public.seo_audit_findings
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE INDEX idx_seo_audit_findings_run ON public.seo_audit_findings (run_id, severity);

-- Admin RPCs
CREATE OR REPLACE FUNCTION public.get_seo_audit_summary(p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid, started_at timestamptz, finished_at timestamptz, status text,
  total_routes integer, failing_routes integer, total_findings integer, metadata jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, started_at, finished_at, status, total_routes, failing_routes, total_findings, metadata
  FROM public.seo_audit_runs
  WHERE public.is_admin(auth.uid())
  ORDER BY started_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 200));
$$;
GRANT EXECUTE ON FUNCTION public.get_seo_audit_summary(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_seo_audit_findings(p_run_id uuid)
RETURNS TABLE (
  id uuid, route text, check_name text, severity text, message text, evidence jsonb, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, route, check_name, severity, message, evidence, created_at
  FROM public.seo_audit_findings
  WHERE run_id = p_run_id AND public.is_admin(auth.uid())
  ORDER BY severity DESC, route;
$$;
GRANT EXECUTE ON FUNCTION public.get_seo_audit_findings(uuid) TO authenticated;

-- Schedule nightly cron jobs (requires pg_cron + pg_net, already enabled).
DO $$
DECLARE
  base_url text := 'https://vgmbvbajgqzuhjgbrrld.supabase.co';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnbWJ2YmFqZ3F6dWhqZ2JycmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4MjYxMTMsImV4cCI6MjA4MjQwMjExM30._xdlrFL4cKSlYRmhTZUTAx0-UiNBRjtRwebv1OlVSOE';
BEGIN
  PERFORM cron.unschedule('seo-route-audit-nightly') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'seo-route-audit-nightly'
  );
  PERFORM cron.unschedule('gsc-submit-sitemap-nightly') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'gsc-submit-sitemap-nightly'
  );

  PERFORM cron.schedule(
    'seo-route-audit-nightly',
    '15 2 * * *',
    format($cron$
      SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := jsonb_build_object('trigger','cron','time', now())
      );
    $cron$,
      base_url || '/functions/v1/seo-route-audit',
      jsonb_build_object('Content-Type','application/json','apikey',anon_key,'Authorization','Bearer ' || anon_key)::text
    )
  );

  PERFORM cron.schedule(
    'gsc-submit-sitemap-nightly',
    '15 3 * * *',
    format($cron$
      SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := jsonb_build_object('trigger','cron','time', now())
      );
    $cron$,
      base_url || '/functions/v1/gsc-submit-sitemap',
      jsonb_build_object('Content-Type','application/json','apikey',anon_key,'Authorization','Bearer ' || anon_key)::text
    )
  );
END$$;
