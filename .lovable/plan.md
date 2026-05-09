# Track B Implementation Plan

Five strategic modules, sequenced by leverage and risk. Each is its own build cycle with its own migration, RLS, edge functions, and QA. Do **not** ship them in one PR — order matters because Health Score and StockFund both consume signals produced by the earlier modules.

Recommended order: **VoC → Geo‑Intelligence → Bundling → Health Score → StockFund.**

Reasoning: VoC reuses existing chat data (fastest, no new APIs, feeds Health Score). Geo unlocks hyperlocal targeting that Bundling and Health Score both reference. Bundling needs inventory + sales history already in the app. Health Score depends on VoC, Bundling, and Geo signals. StockFund last because it touches money + regulation and needs a healthy Health Score as its underwriting signal.

---

## Phase 1 — Voice of Customer (VoC) — 6–8 days

**Goal:** Sentiment + theme analysis on every customer message and CSAT response, surfaced as a "Wateja Sauti" tab under `/analytics`.

### Schema
- `customer_sentiment_log` — `id`, `business_id`, `conversation_id`, `message_id`, `customer_id`, `sentiment` (`positive|neutral|negative`), `score numeric(3,2)`, `themes text[]`, `language` (`en|sw|sheng`), `analyzed_at`.
- `business_sentiment_daily` — pre-aggregated rollup: `business_id`, `date`, `total`, `positive`, `neutral`, `negative`, `top_themes jsonb`.
- RLS: members of `business_id` can read; only edge function (service role) writes.

### Edge function
- `analyze-customer-sentiment` — triggered after each new customer message via PG trigger → `pg_net` POST. Uses `google/gemini-2.5-flash` via Lovable AI (no key). Zod-validated body, rate-limited via `_shared/rate-limiter.ts`. Detects Swahili/Sheng and routes to a localized prompt.
- Nightly cron `rollup-sentiment-daily` writes `business_sentiment_daily`.

### UI
- New tab `Wateja Sauti` in `src/pages/Analytics.tsx`: 30/60/90‑day sentiment trend (recharts), top recurring themes word cloud, drill-down list of negative messages with "View conversation" deep link.
- Reuse `useDashboardCharts` pattern; new hook `useCustomerSentiment`.

### Verification
- Seed 50 messages via `seed-inbox-data`, confirm rows appear in `customer_sentiment_log` within 60s.
- Playwright: `e2e/voc-analytics.spec.ts` — load tab, assert chart renders, filter by negative.

---

## Phase 2 — Geo‑Intelligence & Hyperlocal Optimizer — 8–12 days

**Goal:** Map-based onboarding location capture + AI-generated hyperlocal advice (foot traffic, competitors nearby, event calendar) at `/geo-insights`.

### Decision needed before start
- **Map provider:** Mapbox (recommended, generous free tier, great Africa coverage) vs Google Maps (more accurate POI in Nairobi, paid). Default Mapbox.
- Add secret: `MAPBOX_PUBLIC_TOKEN` (publishable, OK in code via `.env`).

### Schema
- `businesses` — add `latitude numeric`, `longitude numeric`, `geo_label text` (e.g. "CBD, Nairobi"), `service_radius_km int default 5`.
- `geo_insights` — `business_id`, `generated_at`, `summary text`, `recommendations jsonb`, `nearby_competitors jsonb`, `local_events jsonb`, `expires_at`.
- RLS: business members read own row; service role writes.

### Onboarding update
- Add step `LocationStep.tsx` after `BusinessDetailsStep` with Mapbox GL JS picker + reverse geocode.
- Existing onboarded users prompted via banner on Dashboard once.

### Edge function
- `generate-local-insights` — input `{ business_id }`. Pulls business profile + recent sales + Mapbox `places` API for competitors within `service_radius_km`. Calls `google/gemini-2.5-pro` with localized prompt (KES, Swahili allowed). Caches 7 days.
- Manual "Refresh insights" button on `/geo-insights` (rate-limited 1/day).

### UI
- New page `src/pages/GeoInsights.tsx` + route. Map on left (business pin + competitor pins + radius circle), recommendations + events on right. Filters: radius (1/3/5/10 km), competitor category.
- Add to sidebar nav.

### Verification
- Seed 3 businesses in Nairobi/Mombasa/Kisumu, generate insights, confirm KES + Swahili phrases present.
- Playwright: location picker writes lat/lng; refresh button respects rate limit.

---

## Phase 3 — Cross-Sell & Bundling Engine — 5–7 days

**Goal:** "Bidhaa Bundle" tab in `/inventory` plus checkout suggestions, with weekly auto-optimization.

### Schema
- `bundles` — `id`, `business_id`, `name`, `discount_pct numeric`, `is_active bool`, `auto_generated bool`, `created_at`.
- `bundle_items` — `bundle_id`, `product_id`, `quantity int default 1`. PK `(bundle_id, product_id)`.
- `bundle_performance` — `bundle_id`, `date`, `views int`, `purchases int`, `revenue_kes numeric`.
- RLS: business members CRUD own bundles.

### Edge functions
- `optimize-bundles` (weekly cron) — runs market-basket analysis on `stock_movements` joined to a future `sales` table (or current order data). Generates up to 10 candidate bundles per business with `auto_generated = true`, owner can promote/edit.
- `suggest-bundle-at-checkout` — input cart items, returns matching active bundles ranked by `bundle_performance.purchases`.

### UI
- New tab `BundlesTab.tsx` in `src/pages/Inventory.tsx`: list bundles, create/edit dialog (multi-product picker), performance sparkline per bundle, "Auto-suggest" panel showing AI candidates.
- Hook `useBundles`.

### Verification
- Manually create 1 bundle, simulate purchase via SQL, confirm performance row updates.
- Cron execution logged in `audit_logs` with action `bundle.auto_optimize`.

---

## Phase 4 — Biashara Health Score — 6–8 days

**Goal:** Public, blockchain-anchored reputation badge at `/b/:slug` with transparent factor breakdown.

### Schema
- `biashara_health_scores` — `business_id`, `score int (0-100)`, `tier text (bronze|silver|gold|platinum)`, `factors jsonb`, `calculated_at`, `valid_until`, `verification_hash text` (SHA-256 of factors+timestamp).
- `business_reviews` — `id`, `business_id`, `customer_id`, `rating int (1-5)`, `comment text`, `is_anonymous bool default true`, `consent_to_display bool default false`, `created_at`. RLS: public read where `is_anonymous AND consent_to_display`.
- `businesses` — add `slug text unique`, `public_profile_enabled bool default false`.

### Score formula (transparent, shown on profile)
- 30% — Response speed (`sla_tracking.first_response_time` last 30d)
- 25% — CSAT average (`csat_responses.rating`)
- 20% — Sentiment ratio (`business_sentiment_daily` positive %)
- 15% — Resolution rate (resolved vs total)
- 10% — Tenure + review volume

### Edge functions
- `calculate-biashara-health` (weekly cron + on-demand for owner). Computes factors, stores hash. ODPC-compliant: only aggregates, no raw PII.
- `serve-public-profile` — public, no JWT, reads `biashara_health_scores` + anonymized testimonials only.
- `embed-badge-svg` — returns inline SVG with score + tier, cacheable.

### UI
- Owner dashboard widget `HealthScoreCard.tsx` with factor breakdown bars + "Why?" tooltip per factor.
- Public route `/b/:slug` (dark navy theme, shield badge, Hongera confetti at 80+, 90+, 100). Uses `framer-motion` + `react-confetti`.
- Settings → "Public profile" toggle that generates slug.

### Verification
- Snapshot test of score for known fixture business.
- Verify public route works without session; private fields never leaked (Playwright as anon).
- Audit log entry on every recalculation.

---

## Phase 5 — StockFund inventory financing — 10–14 days (highest risk, do last)

**Goal:** Automated inventory micro-loans with M-Pesa B2C disbursement and standing-order repayment.

### Pre-requisites (block start until ready)
- ODPC compliance review for credit data handling.
- Real lender partner agreement (Lovable does not lend directly).
- Daraja **B2C** API access (separate from existing STK push) — needs new initiator credentials and security credential (RSA-encrypted password).
- New secrets: `MPESA_B2C_INITIATOR_NAME`, `MPESA_B2C_SECURITY_CREDENTIAL`, `MPESA_B2C_SHORTCODE`, `LENDER_API_KEY`, `LENDER_WEBHOOK_SECRET`.

### Schema
- `stockfund_loans` — `id`, `business_id`, `principal_kes numeric`, `interest_rate_pct numeric`, `term_days int`, `status` (`pending|approved|disbursed|repaying|repaid|defaulted`), `disbursed_at`, `due_at`, `lender_ref text`, `health_score_at_application int`.
- `stockfund_repayments` — `loan_id`, `amount_kes`, `mpesa_ref text`, `paid_at`, `status`.
- `stockfund_offers` — auto-generated pre-approved offers based on Health Score ≥ 70 + sales history.
- RLS: only owner sees own loans. Service role writes via webhook.

### Edge functions
- `stockfund-apply` — validates eligibility (health score ≥ 70, no active default), forwards to lender API.
- `stockfund-disburse` — on lender approval webhook, fires Daraja B2C to owner's M-Pesa.
- `stockfund-repay-cron` (hourly) — checks due loans, initiates STK push for installment.
- `stockfund-webhook` — receives lender + Daraja callbacks with HMAC verification.

### UI
- Dashboard widget showing pre-approved offer (if any).
- New page `/stockfund` with: active loan progress bar, repayment schedule, history, "Apply" wizard with consent checkboxes.
- Admin: add `/security` style monitoring page for ops to see all loans + statuses (admin-only RLS).

### Verification
- Sandbox Daraja B2C end-to-end test.
- Replay webhook with bad HMAC → must reject.
- Default scenario: simulate missed payment → status flips to `defaulted`, audit log entry, owner notified.
- Load test: 100 concurrent applications.

---

## Cross-cutting concerns (apply to every phase)

- **Migrations:** one per phase, RLS on every new table, never `auth.users` FKs.
- **Audit logging:** every sensitive action calls `log_user_action` (`bundle.created`, `loan.disbursed`, `health_score.recalculated`, `geo_insights.refreshed`, etc.).
- **Rate limiting:** all new edge functions reuse `_shared/rate-limiter.ts`.
- **Localization:** Swahili/Sheng support per existing patterns; KES formatting via `formatKES` util.
- **Feature flags:** add `feature_flags` JSONB on `businesses` so we can roll Phase 4 + 5 to a beta cohort first.
- **Supabase linter:** run after every migration approval.

---

## Decisions needed before I start Phase 1

1. **Map provider** for Phase 2: Mapbox (default) or Google Maps?
2. **Public profile slug strategy** for Phase 4: auto-generated from business name, or owner-chosen with availability check? (Default: auto, editable once.)
3. **Phase 5 lender partner**: do you already have one, or should I scaffold the integration against a mock lender API and you swap creds later?
4. **Order confirmation**: proceed VoC → Geo → Bundling → Health → StockFund, or reorder?

Reply with answers (or "approved, defaults") and I'll start **Phase 1 (VoC)** end-to-end. After it ships I'll come back with the Phase 2 build.
