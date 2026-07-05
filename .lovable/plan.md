# SmartReach Capital — Revenue-Based Financing

Full-depth scope: SmartReach Score → eligibility → application → underwriting → M-Pesa disbursement → repayment tracking → partner lender webhook. Ships as one migration + two edge functions + one dashboard page + one admin page.

## Product model
- Revenue-based advance, not a loan. Business gets a lump sum, pays back a fixed % of daily M-Pesa GMV until the total repayment (advance × factor) is met.
- Advance ceiling = f(SmartReach Score, verified 30-day GMV, business age). Cap 3× monthly GMV, max KES 500,000 for first offers.
- Factor: 1.10 (score ≥ 80), 1.15 (60–79), 1.20 (40–59); ineligible below 40 or under 90 days of trading.
- Revenue share: 5–20% of daily M-Pesa GMV depending on urgency.

## What ships

1. **Eligibility engine** — SECURITY DEFINER function `compute_capital_offer(business_id)` reads:
   - `business_health_score.overall` (SmartReach Score),
   - last 90d of `transactions` where `payment_method='mpesa'` and `type='income'`,
   - business age from `businesses.created_at`.
   Returns `{ eligible, max_advance_kes, factor, revenue_share_pct, reason }`.

2. **`/capital` dashboard** (business owner) — shows current offer, score gauge, "why this amount" breakdown, apply CTA. If active advance exists → shows balance, next projected auto-repayment, schedule.

3. **Application flow** — user picks amount ≤ max, revenue share % (5/10/15/20), reviews terms, e-signs (checkbox + full name), submits. Creates `capital_applications` row (status=submitted).

4. **Admin review queue** at `/admin/capital` — pending applications, one-click approve/reject with note, view full offer computation, view SmartReach Score history.

5. **M-Pesa disbursement (sandbox)** — on approval, edge function `capital-disburse` calls Daraja B2C in sandbox mode, records `capital_advances` row (status=disbursed), logs to `audit_logs`. Real credentials optional via secrets.

6. **Repayment engine** — daily cron (via existing cron infra) computes `repayment_due = today's M-Pesa GMV × revenue_share_pct`, inserts `capital_repayments` row (status=pending), triggers STK for collection (sandbox by default).

7. **Partner lender webhook** — outbound `capital-underwrite` edge function forwards approved applications to a configured partner (SACCO/bank) via signed POST, ingests decision via inbound webhook `capital-decision` (HMAC-verified). Falls back to in-house when no partner is configured.

## Data model

```text
capital_offers                snapshot of current computed offer per business
  business_id (PK), score, max_advance_kes, factor, revenue_share_range,
  computed_at, factors jsonb

capital_applications          user-submitted requests
  id, business_id, user_id, requested_amount_kes, revenue_share_pct,
  factor, total_repayment_kes, status
    (submitted|under_review|approved|rejected|disbursed|repaid|defaulted|cancelled),
  offer_snapshot jsonb, terms_accepted_at, esign_name,
  reviewed_by, reviewed_at, review_note,
  partner_id (nullable), partner_reference (nullable)

capital_advances              disbursed advances
  id, application_id (unique), business_id, principal_kes,
  factor, total_owed_kes, amount_repaid_kes, revenue_share_pct,
  status (active|repaid|defaulted), disbursed_at,
  mpesa_disbursement_ref, closed_at

capital_repayments            daily/manual repayments
  id, advance_id, amount_kes, source (auto_mpesa|manual|partner),
  mpesa_reference, status (pending|paid|failed), collected_at

capital_partners              partner lenders (SACCOs/banks)
  id, name, kind (sacco|bank|internal), webhook_url,
  webhook_secret_hash, is_active, created_at

capital_audit                 append-only audit for capital actions
  id, actor_user_id, business_id, action, entity_type, entity_id,
  metadata jsonb, created_at
```

## Access rules (plain English)
- **Business owner** can view their own offer, advances, repayments; submit applications tied to businesses they own.
- **Business members** can view offer read-only; cannot apply.
- **Admins** can view/approve/reject everything, manage partners.
- **Anonymous**: no access.
- Partner webhooks bypass RLS via `service_role` in edge functions; each call HMAC-signed.

## Edge Functions
- `capital-offer` (JWT) — recomputes & returns current offer for the caller's active business.
- `capital-apply` (JWT) — validates amount ≤ max, records application, dispatches to `capital-underwrite` if a partner is configured for the business's SACCO.
- `capital-disburse` (JWT, admin) — approves + calls M-Pesa B2C sandbox, writes advance.
- `capital-repayment-run` (no JWT, scheduled) — daily job: for each active advance, compute due % of today's GMV, create repayment, initiate STK.
- `capital-decision` (no JWT, HMAC) — inbound partner webhook to accept/reject applications.
- `capital-underwrite` (server-called only) — outbound signed POST to partner webhook.

## UI
- `src/pages/Capital.tsx` — owner dashboard with offer card, score gauge, active advance card, repayment schedule.
- `src/pages/admin/CapitalAdmin.tsx` — applications queue with approve/reject.
- `src/components/capital/OfferBreakdown.tsx`, `src/components/capital/ApplyDialog.tsx`, `src/components/capital/RepaymentSchedule.tsx`.
- Hook: `src/hooks/useCapital.tsx` (`useCapitalOffer`, `useMyAdvance`, `useApplyForCapital`, `useCapitalApplications`, `useApproveApplication`, `useRejectApplication`).

## Out of scope for this pass
- FICO-style external credit bureau lookup.
- Automated collections escalation / SMS dunning.
- Refinancing/top-ups on active advances.
- Anything requiring live M-Pesa (all Daraja calls default to sandbox; real keys behind `MPESA_ENV=live` gate).

## Secrets required (already present or to add)
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_ENV` (sandbox|live) — will prompt to add if missing.
- `CAPITAL_PARTNER_WEBHOOK_SECRET` — generated automatically.

## Files
- 1 migration (~280 lines) — tables, enums, RLS, `compute_capital_offer` + `record_capital_repayment` functions, `update_updated_at_column` triggers, GRANTs.
- 6 edge functions.
- 5 new frontend files + 2 routes registered in App.tsx.
