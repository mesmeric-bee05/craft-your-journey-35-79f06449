# Capital Ops Hardening + Voice & Cultural Moat

Two tracks. Track A finishes the Capital operations loop you listed. Track B starts the two Master-Document modules that are still completely absent from the codebase: the Voice Commerce Engine and the cultural-language layer (Swahili / Sheng' / Kenglish registers + Kenyan Business Calendar intelligence).

## Verified current state

- `capital_webhook_events` exists (partner_id, event, advance_id, headers, body, sig_valid, status, error, processed_at) with an admin-only read policy — but it has **no dedupe/idempotency column**, so a repeated partner delivery is logged and processed twice.
- `capital_repayments` has **only a primary key** — no unique constraint on `checkout_request_id` or partner reference, so duplicate callbacks can insert duplicate repayment rows.
- Cron alerting exists (`_shared/cron-alerts.ts`, Slack + audit log) but is wired only into `snapshot-health-scores` and `security-rescan-runner` — not into the capital webhook, disbursement, or repayment-cron paths.
- `CapitalOpsPage` has CSV export for webhook events only, and a "Reprocess" button on failed events only.
- No voice/speech code anywhere in `src/`, and no Sheng'/register-aware language layer beyond ad-hoc prompt text.

## Track A — Capital operations

### A1. Idempotency (database + functions)
- Migration: add `dedupe_key text` to `capital_webhook_events` with a unique index; add `unique (advance_id, checkout_request_id)` and a unique partial index on `(advance_id, source, external_reference)` to `capital_repayments`.
- `capital-partner-webhook`: compute `dedupe_key` from partner id + event id (or HMAC signature digest when the partner sends no id). On conflict, log the event as `duplicate` and return 200 without reprocessing.
- `record_capital_repayment` RPC: make the insert conflict-tolerant and return the existing repayment id instead of creating a second row; recompute advance balance from the repayment sum rather than incrementing.
- `mpesa-b2c-disburse`: refuse to re-request a payout when `disbursement_status` is already `processing`/`disbursed` unless an explicit `force` flag from the admin retry action is set.
- `mpesa-b2c-callback` and the STK repayment path become safe to call repeatedly.

### A2. Failure alerting
- Extend `_shared/cron-alerts.ts` with a generic `notifyOpsFailure` (Slack blocks + audit row) carrying deep links to `/admin/capital/ops`, `/admin/health`, and `/security/findings`.
- Fire it on: partner webhook signature failure or processing error, disbursement failure, repayment-cron failure, and stuck disbursements (status `processing` older than 30 minutes, detected by the repayment cron).
- Email path reuses the existing transactional-email attempt and degrades silently if email infra is not provisioned.

### A3. Per-event replay
- Add a `replay_webhook` action to `capital-ops-admin` that re-runs the stored event body through the same handler as the live webhook, bypassing the dedupe guard for that single event, and writes a replay audit row (actor, event id, outcome).
- Available on **every** event row (not just failed ones), rate-limited via `check_and_record_admin_action`, with inline per-row success/failure feedback and the resulting status badge refresh.

### A4. Ops export (CSV + PDF)
- Shared export helper covering webhook events, cron runs, and disbursement/repayment history with the active filters applied.
- CSV as today; PDF via a client-side generator producing a paginated, branded audit report (title, filter summary, generated-at, row table).

### A5. User-facing Capital status page
- New section on `/capital`: application timeline (submitted → under review → approved → disbursed), disbursement progress with M-Pesa reference and failure reason in plain language, repayment activity table with running balance, and a "last synced" line showing the latest webhook/cron timestamp for that advance.
- Backed by a security-definer RPC returning only the owner's advance status/timestamps — no partner or admin fields exposed.

## Track B — Voice & cultural moat (first shippable slice)

### B1. Voice Commerce Engine (MVP)
- `VoiceCommandBar`: hold-to-talk mic control available from the dashboard shell, using the browser speech API with a graceful "not supported" fallback.
- `voice-command` edge function: transcribed text → intent classification (sales query, stock update, inventory reorder, campaign draft) → executes against existing hooks/tables, returning a spoken-style reply plus a structured confirmation card. Write actions always require explicit confirmation.
- Supported first intents: "today's sales", "low stock", "add N units of X", "unpaid invoices".
- Language auto-detection across English / Swahili / Sheng' with the reply rendered in the detected language.

### B2. Cultural language layer
- Central `src/lib/culture/` module: register detection (casual Sheng', professional Swahili, Kenglish code-switch), a curated phrase/lexicon map, and a shared system-prompt builder used by content generation, reply suggestions, Biashara Mind, and the voice assistant, so tone is consistent everywhere.
- Business-wide language/register preference in `user_settings`, surfaced in Settings.

### B3. Kenyan Business Calendar Intelligence
- Seeded calendar of Kenyan business cycles (school-fee rushes in Jan/May/Aug/Nov, Eid al-Fitr, Eid al-Adha, Christmas, Easter, Mashujaa Day, Jamhuri Day, harvest windows).
- Dashboard/marketing surface: "coming up in 2-4 weeks" cards with a one-click campaign draft prefilled by the cultural prompt builder.

## Explicitly deferred (Series A/B in the document, not in this plan)

Autonomous multi-agent campaign manager, blockchain-verified work history and supply-chain trust network, AR product visualisation, multi-currency pan-African payment stack, carbon/ESG reporting, KRA auto-filing. Each is its own phase and depends on Track A/B landing first.

## Technical notes

- All new SQL goes through one migration per track step with explicit `GRANT`s and RLS policies; admin-only surfaces continue to use `is_admin(auth.uid())` plus `check_and_record_admin_action` rate limiting.
- Webhook and replay handlers share a single extracted handler module under `supabase/functions/_shared/` so live and replayed events can never diverge.
- Voice write actions reuse existing hooks and RLS paths — no new privileged write path.
- Typecheck and build after each track step.
