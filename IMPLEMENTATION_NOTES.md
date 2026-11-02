# SmartReach AI implementation notes

## Implemented in this working copy

The repository now ignores local environment files, includes a credential-free `.env.example`, removes the tracked `.env` from the Git index, and uses a regenerated `package-lock.json` that matches the current `package.json`. The current `.env` contained only browser-facing `VITE_` configuration variables; no service-role key was committed in that file. Historical Git objects may still contain the old file, so repository-history rewriting and credential rotation remain owner-approved actions.

A complete `public/manus-routes.json` manifest was added from the declared React Router table. It contains 45 page-route patterns, including dynamic public and protected routes, and is copied into the production `dist` output.

All page modules are now loaded through route-level `React.lazy` imports behind a shared `Suspense` loading boundary. The production build emits page chunks such as `Dashboard`, `Analytics`, `Settings`, `Social`, `Capital`, and `Wellness` instead of eagerly loading every page in the initial entry module. The largest initial JavaScript chunk is now approximately 550 kB minified; heavy page chunks remain deferred until their routes are visited.

Webhook and database hardening was added through `supabase/migrations/20261102211000_webhook_hardening.sql` and the corresponding Edge Function changes. Payment settlement is now atomic and idempotent; Stripe signatures use timestamped verification; support webhooks use timestamped signatures, event deduplication, and tenant checks; and capital partner webhooks reject stale or forgeable fingerprint requests.

A CI pipeline now performs frozen-lockfile installation, lint, typecheck, production build, route-manifest validation, artifact upload, staging smoke checks, and strict deployed security-header checks. The existing security workflow was updated so main/scheduled runs do not silently pass when authenticated security jobs are skipped.

## Validation

The following local checks pass in the clean working copy:

- `npm ci --ignore-scripts --no-audit --no-fund`
- `npm run typecheck`
- `npm run lint` — 0 errors; 385 warnings remain, predominantly pre-existing `@typescript-eslint/no-explicit-any` warnings in integration and Edge Function code.
- `npm run build`
- `npm run verify:routes`
- `git diff --check`

The build still reports a few large deferred chunks, including chart/export dependencies. This is expected after route-level splitting and is materially better than eagerly loading the entire feature surface. Further manual chunking can be considered after measuring real staging performance.

## Remaining owner/deployment actions

- Apply the new Supabase migration to an isolated staging project before production.
- Rotate and update capital-partner clients to the new timestamped HMAC protocol.
- Update support webhook senders to include event IDs, business IDs, timestamps, and the new signed payload format.
- Configure `STAGING_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TEST_USER_JWT`, `TEST_USER_ID`, `TEST_OTHER_USER_ID`, `TEST_BUSINESS_ID`, `TEST_OTHER_BUSINESS_ID`, and webhook/security secrets in GitHub Actions or the deployment secret manager.
- Review whether public avatar reads are an intentional product requirement; use private storage and signed URLs if not.
- Do not run destructive fixture tests against production.
