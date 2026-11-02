# SmartReach AI implementation plan

## Objective
Stabilize and harden the existing SmartReach AI application without replacing working features or inventing unsupported infrastructure. Work from the current public repository state, preserve existing behavior, and validate every change with reproducible checks.

## Current baseline
- Vite + React + TypeScript PWA.
- Supabase authentication, database, storage, migrations, RPCs and Edge Functions.
- Broad feature surface: onboarding, dashboard, inbox, marketing, social, inventory, payments, talent, capital, wellness, analytics, SEO and security operations.
- Existing repository snapshot was cloned at the latest public commit available during this work.
- Baseline issue: `npm ci` is not reproducible because the committed `package-lock.json` is out of sync with `package.json`.
- Baseline issue: a populated `.env` file is tracked in Git; the working-copy values must remain local and must not be committed.
- Baseline issue: `/manus-routes.json` is absent even though the application has a complete route table.

## Implementation approach
1. Repair repository hygiene and dependency reproducibility first.
2. Add an accurate route manifest derived from `src/App.tsx`; exclude APIs, assets, system routes and protected/private routes from public SEO declarations where appropriate.
3. Run lint, type/build checks and existing security scripts with safe environment handling.
4. Review shared Edge Function authorization, CORS, input validation, rate limiting, service-role boundaries, webhook authentication and tenant checks.
5. Fix only verified defects and incomplete requirements, preserving existing APIs and user flows.
6. Add focused regression tests for each security or reliability fix.
7. Re-run all available checks and produce a change log with remaining blockers.

## Project structure
- `src/`: React application, route declarations, pages, components, hooks and client-side security helpers.
- `src/integrations/supabase/`: browser Supabase client and generated types/integration code.
- `src/lib/`: shared client utilities, logging, security headers, audit and routing helpers.
- `supabase/migrations/`: database schema, RLS policies, RPCs, audit and security records.
- `supabase/functions/`: authenticated Edge Functions, scheduled jobs, payment/webhook handlers and shared server utilities.
- `scripts/`: repository and deployed-environment security checks.
- `e2e/`: Playwright security and protected-route tests.
- `public/`: PWA assets, SEO files and static route metadata.

## Design and engineering guardrails
- Preserve the existing SmartReach visual language and product flows.
- Do not claim production readiness, live integration, regulatory approval or measured performance without evidence.
- Never expose service-role keys or third-party secrets to the browser.
- Keep webhook and scheduled-job endpoints fail-closed.
- Enforce tenant membership server-side and through database policies.
- Use narrow CORS allowlists for browser-callable authenticated functions; retain provider-specific handling only where a webhook requires it.
- Do not test destructive writes against shared production data.
- Do not rotate or delete credentials automatically; document any required rotation for the repository owner.

## Near-term outcomes
- Clean repository baseline with no tracked `.env` credentials.
- Reproducible dependency installation.
- Accurate route manifest available at `GET /manus-routes.json`.
- Passing build/lint and documented security-test status.
- Prioritized list of remaining implementation and hardening work.
