## Scope

Phase 3 (Bundling), Phase 4 (Health Score nightly + dashboard tile), security re-scan & hardening, automated RLS test suite, and an in-app Security Findings page.

---

## 1. Phase 3 — Deeper Bundling Logic

**Schema additions** (`bundles` table already exists; extend):
- `bundle_items` table: `bundle_id`, `product_id`, `quantity`, `unit_price_kes`, `is_optional`.
- `bundle_recommendations` (materialized via nightly job): co-purchase pairs with `support`, `confidence`, `lift`.
- DB function `suggest_bundles(p_business_id)` — basic market-basket from `transactions` + `transaction_items` (last 90 days).

**Edge function** `compute-bundle-suggestions` — owner-only, recomputes recommendations and writes to `bundle_recommendations`.

**UI** at `/bundles`:
- "My Bundles" tab: CRUD with drag-to-reorder products, auto price = sum − discount %, publish-to-profile toggle.
- "AI Suggestions" tab: ranked co-purchase pairs with "Create bundle" CTA.
- "Performance" tab: views, conversions (clicks → orders), revenue contribution.
- Public profile (`/biz/:slug`) already renders bundles; extend to show savings badge and "Add to cart" link.

---

## 2. Phase 4 — Health Score Automation

- Enable `pg_cron` + `pg_net`. Schedule `compute-health-score-batch` edge function nightly at 02:00 EAT.
- New SECURITY DEFINER service function `compute_all_health_scores()` that loops every active business (called from edge function with service role).
- Trend table `business_health_score_history` (snapshots per day) → powers sparklines and delta arrows.
- **Dashboard tile** `HealthScoreTile.tsx` on `/dashboard`: current score, 7-day trend sparkline, top 2 factors needing attention, "View breakdown" CTA.

---

## 3. Security Re-scan + Definer Cleanup

- Re-run `security--run_security_scan`; capture and address new findings.
- Convert these helpers from DEFINER → INVOKER where safe (caller already has SELECT via RLS):
  - `is_business_slug_available`, `is_feedback_slug_available` (querying single-column, no PII): move to a dedicated `slugs` materialized view, anon RPC reads from view.
  - `get_safe_channels`: replace with a regular view + RLS policy `is_business_member(auth.uid(), business_id)` so no DEFINER needed.
- Functions that must stay DEFINER (RLS helpers, public profile RPC, secret accessors): keep, document allowlist in `mem://security/scanner-guidance`, and add `REVOKE ALL ... GRANT EXECUTE TO <specific role>` to minimise exposed surface (e.g. `get_channel_tokens` → owner-only via membership check inside body, EXECUTE granted to `authenticated` only, never `anon`).

**Avatar bucket hardening**:
- Keep `public=true` for direct image rendering (intentional).
- Replace the broad "Avatars are publicly accessible" SELECT policy with:
  - `SELECT` on `storage.objects` allowed to `anon`/`authenticated` only when `bucket_id='avatars' AND (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'` (no listing of root).
- Block bucket-level `list()` by removing broad SELECT and providing per-object access via direct URLs only.
- Add Playwright + bun script tests for anon read of a known avatar (allowed), anon list (denied), authenticated upload to own folder (allowed), authenticated upload to another folder (denied).

---

## 4. Automated Security Test Suite

Layout:
```text
e2e/security/
  rls-tables.spec.ts        ← parametrised across every public table
  rpc-roles.spec.ts         ← anon vs auth/own vs auth/other for every SECURITY DEFINER RPC
  storage-avatars.spec.ts   ← anon read OK, anon list denied, cross-folder write denied
  storage-business.spec.ts  ← folder-scoped policies (existing extended)
  realtime-topics.spec.ts   ← anon subscribe denied; cross-business subscribe denied
  public-profile.spec.ts    ← slug published/unpublished branches; PII never leaked
```
- A `TABLES_UNDER_TEST` registry (generated from `src/integrations/supabase/types.ts`) drives table coverage; each table asserts: anon SELECT denied, cross-tenant SELECT denied, own-tenant SELECT allowed (where intended).
- Wire into `.github/workflows/security-checks.yml` as a new `rls-coverage` job.
- Local runner: `bunx playwright test e2e/security`.

---

## 5. Security Findings Page (in-app)

Route `/security` (admins only via `has_role(auth.uid(),'admin')`).

- **Findings table**: from the existing `security_check_runs` + new `security_findings_history` table (id, source, severity, status `open|fixed|ignored`, fixed_at, ignored_reason, commit_sha).
- Filters: severity, status, source (supabase / supabase_lov / agent / connector), date range.
- Row drill-down sheet: description, remediation link, applied fix narrative, ignored reason, change history.
- "Re-run scan" button → invokes `security-rescan` edge function (owner-only) that calls the scanner API and writes a new run row.
- CSV export of findings for compliance.
- Audit log entry on every state change (fixed/ignored/un-ignored).

---

## 6. Continuous Hardening + SEO + Errors

- Fix all TypeScript/console errors surfaced by the new pages and tests.
- Tighten CSP: drop `'unsafe-eval'` in production build (keep for dev only via Vite plugin).
- SEO: add JSON-LD `LocalBusiness` schema to `/biz/:slug`, sitemap regeneration on slug publish, canonical + OG tags per public page.
- Add `<noscript>` content on public pages for crawlers.
- Update `mem://security/scanner-guidance` after every change; update SLA/CSAT memory if affected.

---

## Open decisions (defaults if "approved, defaults")

1. **Bundle discount model** — % off sum-of-items (default) vs fixed bundle price vs both.
2. **Health-score nightly cadence** — daily 02:00 EAT (default) vs every 6 hours.
3. **Avatar URL strategy** — keep public bucket + signed-folder regex (default) vs flip private and migrate to short-lived signed URLs (breaks existing avatar `<img>` tags until refactor).
4. **Security page visibility** — admins only (default) vs admins + business owners (read-only on their own business's scoped findings).

Reply "approved, defaults" to accept all four and begin Phase 3.
