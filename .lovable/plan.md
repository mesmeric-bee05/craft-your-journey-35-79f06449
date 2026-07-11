
# SmartReach Capital — Go-Live & Ops Phase

Ship the pieces that turn the sandbox-ready Capital flow into a live, observable, and recoverable production system.

## 1. Secrets: switch M-Pesa to live + cron auth

Request via `add_secret` (user pastes values in the secure form):

- `MPESA_ENV` = `production`
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET` (Daraja app)
- `MPESA_PASSKEY`, `MPESA_SHORTCODE` (STK — repayments)
- `MPESA_B2C_SHORTCODE`, `MPESA_B2C_INITIATOR_NAME`, `MPESA_B2C_SECURITY_CREDENTIAL` (B2C — disbursement)
- `CRON_SECRET` — generated via `generate_secret` (32 chars); required by `capital-repayment-cron` `x-cron-secret` header

Format hints on each so pastes are validated (shortcode digits, env enum, credential length).

## 2. Schedule the daily STK repayment cron

Insert (via `supabase--insert`, not migration — contains project URL + anon key) a `pg_cron` job that hits the edge function daily at 09:00 Africa/Nairobi and passes the cron secret:

```text
schedule: '0 6 * * *'  -- 06:00 UTC = 09:00 EAT
job:      net.http_post(
  url  => 'https://<project>.functions.supabase.co/capital-repayment-cron',
  headers => '{"x-cron-secret":"<CRON_SECRET>","Content-Type":"application/json"}',
  body => '{}')
```

Wrap the call so the returned `request_id` is logged into `cron_job_runs` (existing table) with job_name `capital-repayment-daily`. Add a manual "Run now" admin button on the ops dashboard that calls the same function with the secret via a thin server-side edge proxy (never exposing the secret to the client).

## 3. Validate the HMAC partner webhook

Add `supabase/functions/capital-partner-webhook-test/index.ts` — admin-only helper that:

- accepts `{ partner_id, event, advance_id, amount_kes? }`
- fetches the partner's plaintext secret from a new one-time `rotate_capital_partner_secret` cache (see below) OR asks admin to paste it,
- computes `fingerprint = sha256(plaintext)` and `signature = sha256(fingerprint + "\n" + body)`,
- POSTs to the real webhook, returns status + parsed response.

UI: new "Test webhook" dialog on `/admin/capital/partners` (new tab in `CapitalAdmin`) with event picker, advance selector, dry-run toggle, and response viewer. Success writes to `capital_audit` with action `capital.partner.test`.

## 4. Retry actions with status feedback

New admin actions (all admin-only edge functions, all audited):

- **Retry disbursement** — `mpesa-b2c-disburse` already idempotent on `disbursement_status != 'disbursed'`; add explicit `retry=true` path that clears `disbursement_error` and re-invokes. Button appears on advances with `disbursement_status in ('failed','processing_stale')`.
- **Retry repayment** — new `capital-repayment-retry` function: given a `capital_repayments.id` with status `pending`/`failed`, re-queries Daraja `stkpushquery` and updates status, or re-issues STK if expired. Button on repayment rows in audit page.
- **Reprocess webhook event** — persist raw webhook payloads in new `capital_webhook_events` table (id, partner_id, headers, body, sig_valid, status, error, created_at); "Reprocess" replays the event through the same handler using service role. Button on failed rows.

Each action returns `{ ok, message, next_status }` and the UI shows a toast + inline status pill (`queued`, `processing`, `succeeded`, `failed`).

## 5. Ops dashboard: `/admin/capital/ops`

New page with three tabs, all admin-only:

- **Cron runs** — reuse `cron_job_runs` + existing `CronRunsTimeline` filtered to `capital-*` jobs; shows last run, duration, rows affected, next scheduled time, "Run now" button.
- **Webhook events** — table from `capital_webhook_events` with columns: partner, event, advance, sig_valid, status, error, created_at; row expander shows raw body; filters by partner/status/date; reprocess button per row.
- **Disbursement & repayment errors** — joined view of `capital_advances` (failed disbursements) + `capital_repayments` (failed/pending>24h) with retry buttons.

Existing `/admin/capital/audit` page stays as the who/what/when log; add a top-nav link to Ops.

## Technical details

### Migration
```sql
-- capital_webhook_events for durable, replayable ingestion
CREATE TABLE public.capital_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.capital_partners(id),
  event text NOT NULL,
  advance_id uuid,
  headers jsonb NOT NULL DEFAULT '{}',
  body jsonb NOT NULL,
  sig_valid boolean NOT NULL,
  status text NOT NULL DEFAULT 'received',
  error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.capital_webhook_events TO authenticated;
GRANT ALL   ON public.capital_webhook_events TO service_role;
ALTER TABLE public.capital_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read webhook events"
  ON public.capital_webhook_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
```

`capital-partner-webhook` writes to this table before dispatching, so a handler crash leaves a replayable row.

### Files
- `supabase/migrations/<ts>_capital_ops.sql`
- `supabase/functions/capital-repayment-retry/index.ts`
- `supabase/functions/capital-partner-webhook-test/index.ts`
- `supabase/functions/capital-cron-trigger/index.ts` (secure "Run now" proxy)
- edits: `capital-partner-webhook/index.ts` (persist events), `mpesa-b2c-disburse/index.ts` (retry flag)
- `src/pages/admin/CapitalOpsPage.tsx` + `src/hooks/useCapitalOps.tsx`
- `src/components/capital/{WebhookEventsTable,DisbursementErrorsTable,PartnerTestDialog}.tsx`
- routing in `src/App.tsx`

### Sequencing
1. Request secrets (blocks live testing but not code).
2. Migration + audit table.
3. Retry + reprocess edge functions.
4. Ops dashboard UI wired to real tables.
5. Cron insert via `supabase--insert` once `CRON_SECRET` exists.
6. Partner webhook end-to-end test using the test helper; confirm `capital_repayments` + `capital_audit` rows land.

### Out of scope
No new SACCO, PWA, or landing-page work. Daraja stays until user confirms production credentials are valid.
