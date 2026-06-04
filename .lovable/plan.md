
# Phase 5: Security CI, Cron Health, Avatar E2E, SEO, Auto-Rescan

## 1. CI: block merges on RLS/security failures

Update `.github/workflows/security-checks.yml`:
- Add new job `rls-e2e` that runs `bunx playwright test e2e/security/` against the deployed `E2E_BASE_URL` using `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Add `required-checks` aggregator job with `needs: [security-headers, security-definer-roles, storage-access, e2e-deployed, rls-e2e]` and `if: always()` — fails if any upstream job failed/skipped-with-error. This is the single check to mark "Required" in branch protection.
- Trigger remains `pull_request` + `push: main` + nightly cron.
- Document required branch-protection setup in `scripts/README.md`.

## 2. Cron health-check + admin alerting

Database (one migration):
- New table `public.cron_job_runs` (job_name, started_at, finished_at, status `'success'|'failure'`, rows_affected, error_text, duration_ms). RLS: SELECT for admins only via `is_admin(auth.uid())`; INSERT via service role. GRANT to service_role + authenticated.
- Add view/RPC `get_cron_health(p_job_name text)` returning last run + minutes-since-last-success + expected interval; admin-only.
- Update `snapshot-health-scores` edge function to write a row to `cron_job_runs` on both success and failure paths, then call `security-alert` when status='failure'.
- Schedule via `pg_cron` (using `supabase--insert` per docs, since URL/anon key are project-specific): daily 02:00 EAT (23:00 UTC) → `snapshot-health-scores`.
- Second job: `security-rescan` hourly (see §5).

Frontend:
- New route `/admin/health` (admin-only via `is_admin` check in `RequireAuth`-style guard). Tiles per job: last run timestamp, status badge, duration, "stale" warning if `minutes_since_last_success > expected_interval × 1.5`. "Run now" button (admin) invokes the edge function with shared secret stored client-side? No — call a new admin-only edge function `trigger-cron-job` that gates via `is_admin` and forwards the shared secret server-side.
- Add to sidebar under Settings → "System health" (admins only).

## 3. Avatar bucket e2e — anon vs authed

New file `e2e/security/avatars-bucket.spec.ts`:
- **Anon list root** → expect empty/denied.
- **Anon list `/<random-uuid>/`** → expect empty/denied.
- **Anon read** of a seeded UUID-foldered object via public URL → expect 200 (intentional: avatars bucket is public for `<img>` rendering).
- **Anon read** of a non-UUID-foldered object → expect 403/404 (the tightened SELECT policy from earlier migration restricts to UUID folders).
- **Anon signed-URL request** for foreign folder → expect 4xx.
- **Authed upload** to own `auth.uid()` folder → 200.
- **Authed upload** to another user's folder → denied.
- **Authed delete** of own object → 200; of foreign object → denied.
- Seed/cleanup via service-role helper (mirrors `scripts/test-storage-access.ts`).
- Add a parallel non-Playwright runner `scripts/test-avatar-access.ts` for the existing `storage-access` GH job to pick up.

## 4. SEO for new routes

Install `react-helmet-async`, wrap `<App/>` with `<HelmetProvider>` in `src/main.tsx`, remove canonical from `index.html`.

Add `<Helmet>` blocks to:
- `/bundles` (`Bundles.tsx`) — title, description, canonical, og:* (no image).
- `/biz/:slug` (`BusinessPublic.tsx`) — dynamic title `${business.name} — SmartReach`, description from `tagline`, canonical `/biz/<slug>`, og:title/description/url/type=profile, JSON-LD `LocalBusiness` with name, image (logo_url), aggregateRating from health.overall when present, address from `location.geo_label`.
- `/p/:slug` (`PublicProfilePage.tsx`) — same pattern.
- `/security/findings`, `/admin/health` — `noindex` via `<meta name="robots" content="noindex">` (admin pages).
- `/feedback/:slug` (`FeedbackPublic.tsx`) — title + description + canonical.

Update `public/sitemap.xml` generator note: leave BASE_URL placeholder; document that `/biz/<slug>` URLs are added when profiles publish (future enhancement, out of scope here).

## 5. Automated periodic security re-scan → audit trail

New edge function `security-rescan-runner` (service-role, shared-secret guard):
- Calls Supabase Management API security advisor (or runs internal SQL-based checks mirroring `security--run_security_scan`'s known classes — RLS-missing, public grants, function search_path, etc. We'll start with the SQL checks below since the in-IDE scanner isn't reachable from prod):
  - Tables in `public` with `rowsecurity=false`.
  - Tables in `public` with no policies.
  - Functions in `public` without `search_path` set.
  - Storage buckets that are public.
  - GRANTs to `anon` on tables not in an allowlist.
- For each finding: upsert into existing `public.security_findings` keyed on `(scanner_name='auto_rescan', finding_internal_id)`. New findings created with `status='open'`. Findings that previously existed but no longer detected → flip to `status='fixed'` with `resolution_note='auto-resolved'`.
- Write a row to `cron_job_runs` (§2). On any net-new `open` finding, POST to `security-alert` with summary `"N new finding(s) detected"`.

Schedule: every 6 hours via `pg_cron` (using `supabase--insert`).

Frontend (`/security/findings`):
- Add tab/filter "Auto-detected" (scanner_name='auto_rescan').
- Show "Last scan: X mins ago" header tile reading from `cron_job_runs`.
- Add "Run scan now" admin button → calls `trigger-cron-job` edge function.

## Technical details

```text
.github/workflows/security-checks.yml
└─ jobs: security-headers, security-definer-roles, storage-access,
         e2e-deployed, rls-e2e (new), required-checks (new aggregator)

supabase/migrations/<ts>_cron_health_and_rescan.sql
├─ table cron_job_runs + RLS + GRANTs
├─ rpc get_cron_health(text) admin-only
└─ (cron schedules created via supabase--insert, NOT migration)

supabase/functions/
├─ snapshot-health-scores/  (updated: writes cron_job_runs, alerts on fail)
├─ security-rescan-runner/  (new)
└─ trigger-cron-job/        (new, admin-only proxy)

src/
├─ main.tsx                 (HelmetProvider)
├─ pages/AdminHealth.tsx    (new, /admin/health)
├─ pages/Bundles.tsx        (+ Helmet)
├─ pages/BusinessPublic.tsx (+ Helmet + JSON-LD)
├─ pages/PublicProfilePage.tsx (+ Helmet)
├─ pages/FeedbackPublic.tsx (+ Helmet)
├─ pages/SecurityFindings.tsx (+ tab + last-scan tile + run-now)
├─ hooks/useCronHealth.tsx  (new)
└─ App.tsx                  (+ /admin/health route)

e2e/security/avatars-bucket.spec.ts (new)
scripts/test-avatar-access.ts       (new, mirrors existing storage script)
index.html                          (remove static canonical)
```

## Open questions

1. **Cron health alerting threshold**: alert if a job hasn't succeeded in `expected_interval × 1.5` (default), or stricter `× 1.1`? Default: 1.5×.
2. **`/admin/health` access**: admins only (default), or also business_owner role?
3. **Auto-rescan cadence**: every 6 hours (default), hourly, or daily?
4. **JSON-LD on public profile**: include health-score as `aggregateRating` (1–5 mapped from 0–100) so Google can surface it, or omit to avoid implying customer reviews? Default: include only when health based on ≥10 VoC responses.

Reply "approved, defaults" to proceed, or specify overrides.
