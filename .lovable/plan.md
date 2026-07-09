## Scope

Ship the deferred SmartReach Capital pieces end-to-end: live M-Pesa B2C disbursement on approval, a daily STK-push repayment cron, a partner-lender HMAC webhook for external repayment updates, and a first-class approvals audit trail in the admin UI. All work respects existing RLS, KES-only, and secrets patterns.

### 1. Live M-Pesa Daraja B2C disbursement on approval

New edge function `supabase/functions/mpesa-b2c-disburse/index.ts`:
- Admin-only (`verify_jwt` on; check `is_admin(auth.uid())` via SRK client).
- Input: `{ advance_id }`. Loads advance + business owner phone.
- OAuth against Daraja (`MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET`), then POST `/mpesa/b2c/v3/paymentrequest` with `InitiatorName`, `SecurityCredential`, `CommandID=BusinessPayment`, `PartyA=MPESA_B2C_SHORTCODE`, `PartyB=<msisdn>`, `Amount=principal_kes`, `QueueTimeOutURL` / `ResultURL` pointing to new `mpesa-b2c-callback`.
- Insert `transactions` row (`type=payout`, `status=pending`, `external_reference=ConversationID`) and stamp `capital_advances.disbursement_ref`.
- Wrap in `capital_audit` entry (`capital.disburse.request`).

New edge function `mpesa-b2c-callback` (public, no JWT):
- Verifies `ResultCode`, updates matching transaction + advance (`status=active` on success, `status=failed` on failure), writes `capital_audit`.

Migration adds columns `capital_advances.disbursement_ref text`, `capital_advances.disbursement_status text default 'pending'`, `capital_advances.disbursed_msisdn text`. `approve_capital_application` continues to create the advance in `active` with `disbursement_status='pending'`; the callback flips it to `disbursed` or `failed`.

Wire an "Initiate disbursement" button on `CapitalAdmin.tsx` next to Approve (or auto-fire on approval when `MPESA_B2C_ENABLED=true`). Secrets requested via `add_secret`: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_B2C_SHORTCODE`, `MPESA_B2C_INITIATOR_NAME`, `MPESA_B2C_SECURITY_CREDENTIAL`, `MPESA_ENV` (sandbox|production).

### 2. Daily STK repayment cron

New edge function `capital-repayment-cron`:
- Iterates active advances with outstanding balance and a linked phone.
- Computes today's due = `min(outstanding, revenue_share_pct% * yesterday_mpesa_gmv)` from `transactions`.
- Calls the existing `mpesa-stk-push` function per business, passing `metadata.reason='capital_repayment'` and `advance_id`.
- Inserts a `capital_repayments` row with `status='initiated'` and CheckoutRequestID.

Extend `mpesa-callback` (existing) to detect `capital_repayment` metadata: on success, update the matching `capital_repayments` row to `completed`, decrement `capital_advances.balance_owed_kes`, and close advance (`status='repaid'`) when balance hits 0. All writes logged to `capital_audit`.

Schedule via `supabase--insert` (not migration) using `pg_cron` + `pg_net` at `0 9 * * *` Africa/Nairobi.

### 3. Partner lender HMAC webhook

New edge function `capital-partner-webhook` (public, `verify_jwt=false`):
- Reads header `X-Partner-Id` + `X-Signature` (`sha256=<hex>`).
- Looks up `capital_partners.hmac_secret` (new column, encrypted at rest via existing pattern), timing-safe compares HMAC over raw body.
- Rate-limited via `_shared/rate-limiter` (60/min per partner).
- Accepts `{ event: 'repayment.recorded' | 'advance.written_off' | 'advance.status', advance_id, amount_kes?, reference?, occurred_at }`.
- For `repayment.recorded`: insert `capital_repayments` (`source='partner'`), decrement balance, mark advance repaid if zero.
- For `advance.written_off` / `advance.status`: update advance status.
- Every event writes `capital_audit` and returns `{ ok, repayment_id? }`.

Migration adds `capital_partners.hmac_secret text`, `capital_partners.webhook_url text`, `capital_partners.last_event_at timestamptz`, plus `capital_repayments.source text default 'manual'` and `capital_repayments.partner_id uuid references capital_partners`.

Admin helper RPC `rotate_capital_partner_secret(p_partner_id)` — admin-only, returns a new random secret once (never stored plaintext beyond the row).

### 4. Capital approvals audit log UI

- `capital_audit` already exists; extend `approve_capital_application` / `reject_capital_application` to always insert with `metadata` containing `{note, requested_amount_kes, revenue_share_pct, factor}` (approve path already does; reject path gains richer metadata).
- New hook `useCapitalAuditLog(applicationId?, businessId?)` in `useCapital.tsx` querying `capital_audit` filtered by entity.
- New component `CapitalAuditTimeline` rendered inside each queue card (collapsible) and on a new admin route `/admin/capital/:id` showing full history: actor (join `profiles` via SECURITY DEFINER RPC `get_capital_audit(p_application_id)` to safely expose actor name/email), action, timestamp, metadata diff.
- Add a top-level `/admin/capital/audit` page with filters (action type, date range, business search) and CSV export via existing `exportUtils`.

### 5. Cross-cutting hardening & phase hygiene

- Add zod validation on all new edge function bodies; return 400 with field errors.
- Every new function includes CORS headers and structured error responses.
- Update `mem://features/smartreach-capital` with disbursement, cron, webhook, and audit surfaces; note that live M-Pesa is behind `MPESA_B2C_ENABLED`.
- Update `mem://security/scanner-guidance` to whitelist the partner webhook's public JWT-off status (HMAC-protected).
- After each phase: `tsgo --noEmit`, targeted `bunx vitest run` if specs exist, and a Playwright smoke against `/admin/capital` to confirm approve → audit row appears.

## Sequencing

1. Migration: audit metadata, advance disbursement columns, partner secret columns, repayment source columns, `get_capital_audit` RPC. Approval.
2. Audit UI (hook + timeline + `/admin/capital/audit` page) — pure frontend once migration lands.
3. B2C disburse function + callback + admin button; secrets requested before deploy.
4. Repayment cron function + `mpesa-callback` extension + pg_cron schedule.
5. Partner webhook function + `rotate_capital_partner_secret` RPC + admin partner mgmt panel.
6. Memory + docs update, final typecheck, Playwright smoke.

## Out of scope

- No changes to non-Capital flows.
- No production Daraja go-live checklist (Safaricom app review) — code is production-ready but stays in sandbox until user flips `MPESA_ENV=production` and provides prod credentials.
- No SACCO or PWA changes in this pass.

## Technical notes

- B2C SecurityCredential must be pre-encrypted with Safaricom's public cert; user supplies the already-encrypted string as a secret.
- HMAC compares use `crypto.subtle.timingSafeEqual`-equivalent via constant-time compare in Deno.
- pg_cron schedule stored via `supabase--insert` because it embeds the project URL + anon key (per Cloud rules).
- All new tables/columns get `GRANT`s in the same migration; RLS restricts partner rows to admins only (`is_admin(auth.uid())`).
