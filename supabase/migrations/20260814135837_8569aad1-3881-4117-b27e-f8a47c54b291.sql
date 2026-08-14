INSERT INTO public.cron_job_secrets (job_name, secret)
VALUES ('seo-route-audit', encode(gen_random_bytes(32), 'hex')),
       ('gsc-submit-sitemap', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (job_name) DO NOTHING;

SELECT cron.unschedule('seo-route-audit-nightly');
SELECT cron.unschedule('gsc-submit-sitemap-nightly');

SELECT cron.schedule('seo-route-audit-nightly', '15 2 * * *', $$
  SELECT net.http_post(
    url:='https://vgmbvbajgqzuhjgbrrld.supabase.co/functions/v1/seo-route-audit',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-job-secret',(SELECT secret FROM public.cron_job_secrets WHERE job_name='seo-route-audit')
    ),
    body:=jsonb_build_object('trigger','cron','time', now())
  );
$$);

SELECT cron.schedule('gsc-submit-sitemap-nightly', '15 3 * * *', $$
  SELECT net.http_post(
    url:='https://vgmbvbajgqzuhjgbrrld.supabase.co/functions/v1/gsc-submit-sitemap',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-job-secret',(SELECT secret FROM public.cron_job_secrets WHERE job_name='gsc-submit-sitemap')
    ),
    body:=jsonb_build_object('trigger','cron','time', now())
  );
$$);