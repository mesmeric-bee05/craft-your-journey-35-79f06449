## Goal
Add failure alerting (Slack + email), an admin runs-timeline with CSV export, and harden the "Run scan now" action with rate limiting, audit logs, and strict admin checks.

## 1. Failure alerting for cron jobs

**Channels**
- Email via existing app-emails infra (`send-transactional-email`) to all users with `admin` role.
- Slack via the Lovable Slack connector gateway. If no connection is linked, skip Slack silently and log a warning (no hard failure). Prompt user to link the Slack connector during build.

**Template**
- New transactional template `cron-failure-alert.tsx` (subject: "⚠️ Scheduled job failed: {job_name}"). Body shows job name, started_at, duration, truncated error, and CTA buttons linking to `{APP_URL}/admin/health` and `{APP_URL}/security/findings`.
- Registered in `_shared/transactional-email-templates/registry.ts`.

**Trigger points**
- `supabase/functions/snapshot-health-scores/index.ts` — on catch, write `cron_job_runs` row with `status='failure'`, then call new shared helper `notifyCronFailure(job_name, error, started_at, duration_ms)`.
- `supabase/functions/security-rescan-runner/index.ts` — same.
- New shared module `supabase/functions/_shared/cron-alerts.ts` exporting `notifyCronFailure`. It:
  1. Queries `auth.users` joined with `user_roles` where `role='admin'` for recipient emails.
  2. Loops one-recipient-per-send (respects app-email "no bulk" rule — each admin is a distinct recipient of a per-event notice) using `idempotencyKey = ${job_name}-${started_at}`.
  3. Posts to Slack via `https://connector-gateway.lovable.dev/slack/api/chat.postMessage` with `SLACK_API_KEY` + `LOVABLE_API_KEY` when both are present. Channel id read from new secret `SLACK_ALERTS_CHANNEL_ID`.

**Dedup**
- Use `idempotencyKey` so retries within the same run don't double-send.
- Track last alert per job in `cron_job_runs.metadata->alert_sent_at` to avoid re-alerting on transient retries within 10 min.

## 2. Admin runs timeline + CSV export

**Backend**
- New RPC `get_cron_runs_timeline(p_limit int, p_offset int, p_job_name text, p_status text, p_since timestamptz)` (SECURITY DEFINER, admin-only) returning `cron_job_runs` with computed `duration_ms`, paged + filtered. Sorted `started_at DESC`.
- Reuse existing `cron_job_runs` table; `security-rescan-runner` already writes here. Confirm both jobs populate `job_name`, `started_at`, `finished_at`, `status`, `duration_ms`, `error_text`, `rows_affected`, `metadata`.

**Frontend — extend `/admin/health`**
- New `CronRunsTimeline` section under existing health tiles.
- Controls: search box (matches `error_text`/`job_name`), job filter (`snapshot-health-scores`, `security-rescan-runner`, `all`), status filter (`success`/`failure`/`running`/`all`), date range (last 24h / 7d / 30d).
- Table columns: Started, Job, Status (badge), Duration, Rows, Error preview, Actions (expand row for full error JSON).
- "Export CSV" button: client-side conversion of currently filtered results to CSV, downloaded as `cron-runs-{date}.csv`.
- React Query with 30s staleTime, pagination 50 rows/page.

## 3. Harden "Run scan now"

**Authorization**
- `trigger-cron-job` edge function: continue to validate JWT in code (verify_jwt=false default), then call `has_role(uid, 'admin')` via service-role client. Reject with 403 otherwise.

**Rate limiting**
- New table `admin_action_rate_limits` (user_id, action_key, last_invoked_at, invocation_count, window_started_at). RLS: admin/service_role only.
- Helper RPC `check_and_record_admin_action(p_action text, p_max_per_hour int)` — atomic upsert that raises `rate_limit_exceeded` (custom SQLSTATE `P0001`) when over quota. Defaults: 5 invocations/hour per admin per action.
- Edge function calls RPC before kicking off the job; returns 429 with `retryAfterSeconds` on breach.

**Audit logging**
- Always log via `log_user_action('admin.trigger_cron_job', 'cron_job', null, business_id, {job_name, ip, user_agent, success})` — success and failure paths.
- Add IP + user-agent to metadata.

**Frontend**
- Disable "Run scan now" button while in-flight; show toast with rate-limit countdown on 429.

## Files to add/edit (technical)

```text
supabase/migrations/<ts>_cron_alerts_and_rate_limit.sql
  - admin_action_rate_limits table + GRANT + RLS + policies
  - check_and_record_admin_action(text,int) RPC
  - get_cron_runs_timeline(...) RPC

supabase/functions/_shared/cron-alerts.ts          (new)
supabase/functions/_shared/transactional-email-templates/cron-failure-alert.tsx  (new)
supabase/functions/_shared/transactional-email-templates/registry.ts             (edit)
supabase/functions/snapshot-health-scores/index.ts (edit — try/catch + alert)
supabase/functions/security-rescan-runner/index.ts (edit — try/catch + alert)
supabase/functions/trigger-cron-job/index.ts       (edit — rate limit + audit + admin check)

src/hooks/useCronRunsTimeline.tsx                  (new)
src/components/admin/CronRunsTimeline.tsx          (new)
src/pages/AdminHealth.tsx                          (edit — mount timeline)
src/pages/SecurityFindings.tsx                     (edit — surface 429 toast)
```

## Secrets / connectors needed

- Link the **Slack** connector (bot) so `SLACK_API_KEY` is available.
- Add secret `SLACK_ALERTS_CHANNEL_ID` (target channel for failure pings).
- App URL constant: reuse existing `APP_PUBLIC_URL` if set, otherwise read `SUPABASE_URL`-derived fallback and let you set `APP_PUBLIC_URL` later.

## Open questions
1. Slack target — single shared `#alerts` channel via `SLACK_ALERTS_CHANNEL_ID`, or DM each admin? **Default: shared channel.**
2. Rate-limit quota for `Run scan now` — **default 5/hour/admin**; OK or stricter (e.g. 2/hour)?
3. Should the email alert go to every `admin` role user, or only `business_owner` of the affected business? **Default: all admins (jobs are global).**
4. CSV export scope — **current filtered page set** (default) vs full filtered result (extra round-trip)?

Reply "approved, defaults" to proceed, or note any changes.
