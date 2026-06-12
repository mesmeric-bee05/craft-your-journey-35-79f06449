
## Status of your seven items

Three items are already live from the previous phases — I'll skip re-implementing them and just verify:

1. ✅ **Slack + email alerts on cron failure** — `supabase/functions/_shared/cron-alerts.ts` posts to Slack (connector gateway) and tries `send-transactional-email`, with deep links to `/admin/health` and `/security/findings`. Wired into `snapshot-health-scores` and `security-rescan-runner`.
2. ✅ **Searchable cron/security runs timeline with CSV export** — `CronRunsTimeline.tsx` + `get_cron_runs_timeline` RPC, mounted on `/admin/health`.
3. ✅ **Hardened "Run scan now"** — `trigger-cron-job` enforces JWT + `has_role('admin')`, rate-limited via `check_and_record_admin_action` (5/hr), audit-logged with IP/UA.

If you want me to extend any of those (e.g. add an email template, change the rate-limit window), say the word — otherwise I'll focus on the four new items below.

---

## What I'll build

### 1. Connect Google Search Console + verify the published site

- Trigger `standard_connectors--connect` for `google_search_console` so you can pick/authorize the workspace connection. This makes `GOOGLE_SEARCH_CONSOLE_API_KEY` available to edge functions.
- Add a `<meta name="google-site-verification">` tag to `index.html`, with the token value read from a build-time inlined env var (`VITE_GSC_VERIFICATION_TOKEN`) so we can rotate without code changes. Fallback: hardcode the token after the first successful token mint.
- New edge function `gsc-verify-site` (admin-only): requests a META token from `siteVerification/v1/token`, returns it for the user to paste / for us to write into `index.html`, then calls `siteVerification/v1/webResource?verificationMethod=META` and `PUT /webmasters/v3/sites/{encoded}` to register and verify `https://craft-your-journey-35.lovable.app/`.
- Submit sitemap immediately: `PUT /webmasters/v3/sites/{site}/sitemaps/{sitemap}`.

### 2. Automated SEO health-check on every route

- New edge function `seo-route-audit` that:
  - Reads a curated route list (static + dynamic public pages: `/`, `/auth`, `/help`, `/bundles`, `/resources/best-times-to-post-kenya`, plus published `business_public_profiles` slugs and `feedback_forms`).
  - For each URL, fetches the HTML, then validates: presence + length of `<title>` (≤60), `<meta name="description">` (≤160), single `<link rel="canonical">` pointing to self, OG tags (`og:title`, `og:description`, `og:url`, `og:type`), and at least one valid `application/ld+json` block (JSON-parseable).
  - Writes results to a new `seo_audit_runs` + `seo_audit_findings` table (RLS: admin read, service_role write) and logs into `cron_job_runs` so it shows on the timeline.
- Scheduled nightly via pg_cron (02:00 UTC) and manually triggerable through the existing hardened `trigger-cron-job` proxy (whitelist the new job name).
- Failures route through the same `notifyCronFailure` Slack/email path.

### 3. Automated sitemap & robots resubmission after releases

- New edge function `gsc-submit-sitemap` that:
  - HEADs `/sitemap.xml` and `/robots.txt` to confirm 200 + last-modified.
  - Calls `PUT /webmasters/v3/sites/{site}/sitemaps/{encoded-sitemap-url}` to (re)submit.
  - Records a row in `cron_job_runs` with metadata (`{status, warnings, errors}` from the GSC sitemap detail response).
- Trigger options:
  - pg_cron daily at 03:00 UTC (catches deploys without a webhook).
  - On-demand via `trigger-cron-job` from the new SEO admin page.
- Documented note that a true "after release" hook would require a deploy webhook from Lovable, which we don't have — daily cadence + manual button is the practical substitute.

### 4. Admin SEO monitoring page `/admin/seo`

- New route, admin-only (mirrors `/admin/health` guard).
- Sections:
  - **Verification & sitemap status** — current site verification state, last sitemap submission outcome, "Resubmit sitemap now" button (rate-limited via existing admin-action limiter).
  - **Indexing status** — pulls `searchanalytics/query` (last 28 days clicks/impressions) and `urlInspection/index:inspect` for a handful of priority URLs.
  - **Sitemap fetch errors** — surfaces `warnings` + `errors` from the latest `webmasters/v3/sites/{site}/sitemaps/{sm}` response.
  - **Route audit results** — table of failing SEO checks from `seo_audit_findings` with search + CSV export (reuses the CronRunsTimeline pattern).
  - **Recent crawl/verification events** — filtered view of `cron_job_runs` where `job_name in ('seo-route-audit','gsc-submit-sitemap','gsc-verify-site')`.
- Add `/admin/seo` link to the admin nav in `DashboardLayout`.

---

## Technical details

**New edge functions** (all `verify_jwt = false` in code, but enforce JWT + admin in body):
- `gsc-verify-site` — token mint + verify + site registration.
- `gsc-submit-sitemap` — sitemap (re)submission + status fetch.
- `seo-route-audit` — HTML fetch + parse, writes findings.
- All share a new `supabase/functions/_shared/gsc.ts` helper for gateway auth + URL encoding.

**Migration** (`..._seo_monitoring.sql`):
- `seo_audit_runs(id, started_at, finished_at, status, total_routes, failing_routes, metadata jsonb)`
- `seo_audit_findings(id, run_id fk, route, check_name, severity, message, evidence jsonb, created_at)`
- GRANTs (service_role full, authenticated none — read via admin RPC).
- `get_seo_audit_summary(p_limit int)` and `get_seo_audit_findings(p_run_id uuid)` SECURITY DEFINER RPCs guarded by `has_role(auth.uid(),'admin')`.
- Extend `check_and_record_admin_action` allowlist with `gsc.resubmit_sitemap` and `seo.run_audit`.
- pg_cron schedules:
  - `seo-route-audit` daily 02:00 UTC
  - `gsc-submit-sitemap` daily 03:00 UTC

**Frontend**:
- `src/pages/AdminSEO.tsx`, `src/hooks/useSEOAudit.tsx`, `src/hooks/useGSCStatus.tsx`, `src/components/admin/SEOFindingsTable.tsx`.
- SEO meta on the new page set to `noindex`.

**Files touched/created**:
```
+ supabase/functions/gsc-verify-site/index.ts
+ supabase/functions/gsc-submit-sitemap/index.ts
+ supabase/functions/seo-route-audit/index.ts
+ supabase/functions/_shared/gsc.ts
+ supabase/migrations/..._seo_monitoring.sql
+ src/pages/AdminSEO.tsx
+ src/hooks/useSEOAudit.tsx
+ src/hooks/useGSCStatus.tsx
+ src/components/admin/SEOFindingsTable.tsx
~ index.html                       (add google-site-verification meta)
~ src/App.tsx                      (new route)
~ src/components/layout/DashboardLayout.tsx (admin nav link)
~ supabase/functions/trigger-cron-job/index.ts (whitelist new jobs)
~ public/sitemap.xml               (refresh lastmod dates)
```

---

## Open questions before I start

1. **GSC connection** — do you want me to call the connect tool now so you can authorize, or are you connecting it yourself from Connectors?
2. **Verification token placement** — OK to commit the `google-site-verification` token into `index.html` (standard practice), or do you want it in a build secret?
3. **Audit scope** — should the route audit hit the **published** domain (`craft-your-journey-35.lovable.app`) or the preview? Published is the right answer for GSC parity; confirming.
