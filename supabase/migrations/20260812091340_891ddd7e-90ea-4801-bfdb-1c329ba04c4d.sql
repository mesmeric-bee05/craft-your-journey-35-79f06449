CREATE TABLE IF NOT EXISTS public.cron_job_secrets (
  job_name text PRIMARY KEY,
  secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cron_job_secrets TO service_role;

ALTER TABLE public.cron_job_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.cron_job_secrets (job_name)
VALUES ('security-rescan-runner'), ('snapshot-health-scores'), ('seo-route-audit'), ('gsc-submit-sitemap')
ON CONFLICT (job_name) DO NOTHING;