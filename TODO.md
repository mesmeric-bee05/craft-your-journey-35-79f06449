# SmartReach AI implementation TODO

## Completed in this working copy

- [x] Remove the tracked populated `.env` from the Git index and add a credential-free `.env.example`.
- [x] Regenerate the dependency lockfile so clean installation is reproducible.
- [x] Add and validate `/manus-routes.json`.
- [x] Implement route-level React lazy loading with a shared loading boundary.
- [x] Add package scripts for typechecking, route validation, and staging smoke checks.
- [x] Add CI quality, artifact, staging-smoke, and strict security-header verification.
- [x] Harden the deployed security workflow against false-positive skipped authenticated checks.
- [x] Replace the forgeable capital-partner fingerprint scheme with timestamped HMAC verification.
- [x] Add atomic, idempotent payment settlement and durable payment webhook events.
- [x] Add timestamped, replay-safe support webhook ingestion and tenant-bound ticket mutations.
- [x] Record the repository-based security audit and remaining deployment prerequisites.

## Required before production sign-off

- [ ] Apply `supabase/migrations/20261102211000_webhook_hardening.sql` to an isolated staging project and run the authenticated RLS, storage, RPC, and webhook suites.
- [ ] Configure protected GitHub Actions secrets and staging fixtures; main/scheduled security jobs must complete rather than skip.
- [ ] Rotate capital partner clients to `X-Partner-Id`, `X-Timestamp`, and HMAC `X-Signature`.
- [ ] Update support webhook senders to include unique `event_id`, `business_id` for ticket mutations, `X-Webhook-Timestamp`, and timestamped HMAC signatures.
- [ ] Decide whether avatar objects are intentionally public. If not, make the bucket private and issue scoped signed URLs.
- [ ] Move long-lived cron secrets to Supabase Vault or the deployment secret manager.
- [ ] Add generated coverage for every authenticated-callable `SECURITY DEFINER` function.
- [ ] Add deterministic Edge Function tests for webhook replay, stale signatures, malformed signatures, duplicate deliveries, amount mismatch, and concurrent payment delivery.
- [ ] Verify migration version/schema drift against the deployed staging database before release.

The repository now includes an offline `verify:webhooks` contract gate covering signature and amount-mismatch invariants. Live staging execution is still required for concurrent delivery, RLS behavior, and deployed migration verification.

## Advanced feature roadmap, not current production scope

- [ ] Phase agentic AI as suggestion-first, then approval-based tool use, then limited autonomy after safety evidence and user trust data.
- [ ] Keep any wellness assistant non-diagnostic, consent-based, separately retained, excluded from ordinary analytics, and human-escalatable.
- [ ] Do not claim proprietary model training, blockchain audit infrastructure, or clinical compliance unless those components are actually implemented and independently verified.
