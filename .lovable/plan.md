## Overview

This plan covers two tracks. **Track A** is the immediate, scoped work you asked for at the top of the message (CI alerts, secure-download Playwright coverage, /security dashboard filtering/sorting/pagination, approving the pending migration). **Track B** is the much larger strategic roadmap (Geo‑Intelligence, Bundling Engine, VoC, StockFund, Biashara Health Score). Track B is intentionally split into separate phases so we can ship Track A first, prove it, and then sequence the big modules without one giant unreviewable change.

I recommend we **execute Track A in this next build**, then come back and pick which Track B module to start. Doing all of Track B in one shot would mean ~6 weeks of code in one PR — high risk of regressions, especially around security and M‑Pesa.

---

## Track A — Immediate work (one build cycle)

### A1. Approve pending migration & regenerate types
- Confirm the existing `security_check_runs` + `log_user_action` migration is applied; once approved, `src/integrations/supabase/types.ts` will refresh automatically.
- Remove the `(supabase as any)` and `(supabase.rpc as any)` casts in `SecurityDashboard.tsx`, `auditLog.ts`, `useUserSettings.tsx` so they compile against the real generated types.

### A2. CI failure alerts
- Add a new edge function `security-alert` that accepts `{ check_type, status, summary, commit_sha, environment, run_url }`, validates a shared secret header, and:
  - Sends an email via the existing `send-email` function (Resend) to admins on `fail`.
  - Optionally POSTs to a configurable webhook URL (Slack/Discord-compatible JSON).
- Extend `scripts/lib/uploadCheckRun.ts` so after inserting a row with `status === 'fail'` it also calls `security-alert`.
- Add new secrets: `SECURITY_ALERT_WEBHOOK_URL` (optional), `SECURITY_ALERT_EMAILS` (comma list), `SECURITY_ALERT_SHARED_SECRET`.
- Update `.github/workflows/security-checks.yml` to pass `GITHUB_RUN_ID` / commit SHA so alerts link back to the failing run.

### A3. Playwright: secure-download denied state
- New spec `e2e/secure-download-denied.spec.ts` that:
  - Logs in as a user from Business A.
  - Attempts `secureDownload` for an asset belonging to Business B (seeded fixture).
  - Asserts the denial toast text ("You don't have permission to access this file") and that `audit_logs` received a `file.download.denied` row (verified via a small read-only RPC `get_recent_audit_for_user`, scoped to the caller).
- Add a second case for an unauthenticated session attempting the same — should redirect to `/auth` and never call the storage API.

### A4. /security dashboard: filtering, sorting, pagination
- Replace the "latest per type" cards with a richer view:
  - Keep the 3 status cards at the top (most recent run per `check_type`).
  - Add a paginated history table below with columns: Time, Check, Environment, Status, Commit, Summary.
  - Filters: `check_type` (multi), `status` (pass/warn/fail), `environment` (staging/prod), date range (24h / 7d / 30d / custom).
  - Sorting: by `created_at` (default desc) and by `status` (failing first).
  - Pagination: 25 per page using Supabase `range()`.
  - "Failing only" quick toggle that pre-filters `status = 'fail'`.
- All queries scoped through RLS — admins only (route already gated).

### A5. Security hardening pass on what we touch
- Verify `log_user_action` and the new `security-alert` function reject anon callers and validate inputs with Zod.
- Add rate limiting (reuse `supabase/functions/_shared/rate-limiter.ts`) to `security-alert` to prevent alert flooding.
- Run the Supabase linter after the migration approval and resolve anything new.

---

## Track B — Strategic roadmap (separate, sequenced builds)

I will not build these in this cycle. Each is its own multi-day effort and needs its own approval, migrations, and QA. Proposed order (highest leverage first):

1. **Geo‑Intelligence & Hyperlocal Optimizer** — onboarding location step, `geo_insights` table, `generate-local-insights` edge function, `/geo-insights` page with Mapbox/Leaflet. Needs: Mapbox or Google Maps key. Est. 8–12 days.
2. **Voice‑of‑Customer Analytics** — reuses existing chat data, no new APIs, fastest to value. `analyze-customer-sentiment` edge function, `customer_sentiment_log`, `business_sentiment_daily`, "Wateja Sauti" tab under `/analytics`. Est. 6–8 days.
3. **Cross‑Sell & Bundling Engine** — `bundles` + `bundle_items` + `bundle_performance` tables, "Bidhaa Bundle" tab in `/inventory`, checkout suggestions, weekly `optimize-bundles` cron. Est. 5–7 days.
4. **Biashara Health Score** — `biashara_health_scores`, `business_reviews`, weekly `calculate-biashara-health` function, public profile route `/b/:slug`, embeddable SVG badge. Est. 6–8 days.
5. **StockFund inventory financing** — `stockfund_loans`, `stockfund_repayments`, Daraja B2C standing-mandate flow, hourly repayment cron, dashboard widget. Highest regulatory + financial risk; do last with a real lender partner and ODPC sign-off. Est. 10–14 days.

For each Track B item I'll come back with its own focused plan: schema, RLS, edge functions, UI surface, secrets needed, and rollout/feature-flag strategy.

---

## Technical details (Track A)

**New table usage** — none new; reuses `security_check_runs`, `audit_logs`, `user_roles`.

**New edge function** — `supabase/functions/security-alert/index.ts`
- Input (Zod): `{ check_type, status, summary?, commit_sha?, environment, run_url? }`.
- Auth: shared-secret header `x-alert-secret` compared with `SECURITY_ALERT_SHARED_SECRET`.
- Side effects: email via existing `send-email` function, optional webhook POST.
- Config: add block in `supabase/config.toml` with `verify_jwt = false` (called from CI, not a user session).

**Files to add/modify**
- New: `supabase/functions/security-alert/index.ts`, `e2e/secure-download-denied.spec.ts`, `src/components/security/SecurityRunsTable.tsx`, `src/hooks/useSecurityRuns.tsx`.
- Modified: `src/pages/SecurityDashboard.tsx` (add filters/table/pagination), `scripts/lib/uploadCheckRun.ts` (call alert on fail), `.github/workflows/security-checks.yml` (pass commit + run URL), `src/lib/auditLog.ts` and `src/hooks/useUserSettings.tsx` (drop `as any` casts), `supabase/config.toml` (register new function).
- Secrets to add: `SECURITY_ALERT_SHARED_SECRET`, `SECURITY_ALERT_EMAILS`, optional `SECURITY_ALERT_WEBHOOK_URL`.

**Verification**
- After implementing, run Playwright suite locally headless against staging.
- Trigger a synthetic failure by uploading a `status: 'fail'` row from a script and confirm: row appears at top of dashboard with "Failing only" filter, email arrives, webhook fires.
- Run `supabase--linter` after migration approval.

---

## Decision needed before I start Track A

Two small choices:
1. **Alert channels:** email only, webhook only, or both? (Default: both, webhook optional via env.)
2. **Dashboard history retention shown in UI:** last 30 days, 90 days, or all? (Default: 30 days with a "Load older" action.)

If you're happy with the defaults, reply "approved" and I'll execute Track A end‑to‑end. After it ships, tell me which Track B module to plan next.