# SmartReach AI production security audit

## Scope

This repository audit covered the React/Vite application, Supabase migrations and RLS, storage policies, Edge Functions, payment and partner webhooks, support webhooks, existing security scripts, and GitHub Actions workflows. The audit is repository-based; it does not claim that the deployed Supabase project has exactly the same schema or secrets until staging checks run.

## Applied in this change set

- Replaced eager page imports with route-level `React.lazy` imports and a shared loading boundary. The production build now emits page-specific chunks instead of one eager application bundle.
- Added a frozen-lockfile CI quality job for lint, TypeScript, production build, and route-manifest validation.
- Added staging smoke checks for the app shell, route manifest, robots, sitemap, and strict security headers.
- Changed the deployed security workflow so authenticated security suites are mandatory on protected-branch runs when staging fixtures are available; unexpected skips fail the aggregate gate.
- Replaced the capital-partner webhook's forgeable fingerprint-derived body hash with timestamped HMAC verification. The stored non-exported derived secret is no longer sent in requests, and stale requests are rejected.
- Added durable payment and support webhook event tables with unique event identifiers.
- Added an atomic `apply_payment_webhook` RPC that locks the transaction, performs the status transition, and credits the wallet through the ledger function in one database transaction. This removes the stale read-modify-write balance race.
- Implemented Stripe timestamped `t=...,v1=...` signature verification with a five-minute tolerance and removed raw signature logging.
- Added support-webhook timestamped signatures, replay deduplication, business-membership validation for ticket creation, and business-scoped ticket update/escalation queries.

## Verified good controls

- Migration-created public tables consistently enable RLS.
- `business-assets` is private and its object policies scope paths to business membership.
- Avatar writes are scoped to the authenticated user's UUID folder.
- M-Pesa callbacks require the configured callback token and optionally an IP allowlist.
- Capital webhook event deduplication has a unique index and handles concurrent duplicate insertion.
- Wallet ledger functions are revoked from public, anonymous, and authenticated roles and granted to the service role.

## Remaining production prerequisites

1. Apply the new migration to an isolated staging project and run the authenticated storage, RLS, RPC, and webhook tests. The local build cannot prove live policy behavior.
2. Rotate any capital partner integrations to the new protocol: `X-Partner-Id`, `X-Timestamp`, and `X-Signature: sha256=<HMAC-SHA256(sha256(secret), timestamp + '.' + rawBody)>`. Retire the old `X-Fingerprint` protocol.
3. Configure the new support webhook contract with `event_id`, `business_id` for update/escalate events, `X-Webhook-Timestamp`, and the timestamped HMAC signature.
4. Decide whether avatars are intentionally public. The current policy permits public reads for UUID-folder objects; if profile images can be sensitive, make the bucket private and use owner-scoped signed URLs.
5. Keep `cron_job_secrets` service-role-only and move long-lived secrets to Supabase Vault or the platform secret manager when operationally available.
6. Add a complete generated inventory test for every authenticated-callable `SECURITY DEFINER` function; current tests cover only a fixed subset.
7. Provision isolated staging fixtures: `TEST_USER_JWT`, `TEST_USER_ID`, `TEST_OTHER_USER_ID`, `TEST_BUSINESS_ID`, and `TEST_OTHER_BUSINESS_ID`. Without them, authenticated checks must not be interpreted as passed.

## Feature-scope note

The attached agentic-AI and advanced-feature briefs are treated as phased product specifications, not evidence that the corresponding clinical, autonomous-agent, blockchain, or multi-cloud infrastructure is already implemented. Any MindBridge/Rafiki-style wellness feature must remain non-diagnostic, consent-based, isolated from ordinary analytics, and subject to human escalation before production release.
