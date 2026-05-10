# Phase 2 — Geo-Intelligence + Track B Continuation

This plan covers the next big slice end-to-end: Geo-Intelligence (Google Maps), the public business profile (slug), configurable moderation rules for VoC, deeper Wateja Sauti drill-down, and a security/perf hardening pass. It also lines up Phase 3 (Bundling) and Phase 4 (Health Score) so the public profile has real data to show.

## 1. Secrets & prerequisites

- Request `GOOGLE_MAPS_API_KEY` (server, used by edge functions for Geocoding / Places).
- Request `GOOGLE_MAPS_BROWSER_KEY` (HTTP-referrer-restricted, used by `@vis.gl/react-google-maps` in the dashboard).
- Both stored as runtime secrets; the browser key is fetched via a tiny `get-maps-config` edge function so we don't bake it into the bundle and can rotate it.

## 2. Database (single migration)

New tables (all RLS-scoped to `business_id`, members read, owners write):

- `business_locations` — owner business outlets: `lat`, `lng`, `address`, `geo_label` (e.g. `nairobi_cbd`, `westlands`), `service_radius_km`, `is_primary`.
- `geo_entities` — generic ingest table for competitors / suppliers / customer hotspots / events: `entity_type` enum (`competitor|supplier|customer_cluster|event|landmark`), `name`, `lat`, `lng`, `geo_label`, `metadata jsonb`, `source` (`manual|google_places|csv`).
- `geo_insights_daily` — pre-aggregated daily roll-ups per business + geo_label (customer count, avg sentiment, competitor density, opportunity score 0-100).
- `business_public_profiles` — `slug` (unique, owner-chosen, validated via existing `is_feedback_slug_available` pattern → new `is_business_slug_available`), `tagline`, `hero_image`, `is_published`, `show_health_score`, `show_voc_highlights`, `show_bundles`.
- `bundles` (Phase 3 stub used by profile) — `name`, `items jsonb`, `price_kes`, `is_active`, `display_on_profile`.
- `business_health_score` (Phase 4 stub) — `overall`, `voc_component`, `inventory_component`, `engagement_component`, `growth_component`, `computed_at`. Recomputed nightly + on-demand.
- `feedback_moderation_rules` — per-business JSONB rules: `spam_keywords[]`, `block_languages[]`, `min_message_length`, `max_links`, `auto_reject_below_score`, `auto_approve_above_score`, `severity_threshold`, `is_active`.
- `feedback_moderation_log` — every auto/manual decision with rule that fired (audit trail).

Extensions to existing tables:

- `customer_sentiment_log` → add `keywords text[]` and `geo_label text` (nullable) for drill-down + map overlay.
- `business_sentiment_daily` → add `top_keywords jsonb` alongside existing `top_themes`.

DB functions:

- `is_business_slug_available(p_slug text)` — mirrors feedback slug RPC.
- `get_public_business_profile(p_slug text)` — SECURITY DEFINER, returns ONLY published, non-PII fields (profile + latest health score + up to 6 approved VoC highlights + active profile-flagged bundles). No auth required.
- `compute_business_health_score(p_business_id uuid)` — weighted formula documented in code; called by trigger + nightly cron.
- `apply_feedback_moderation()` trigger on `feedback_submissions` insert (anonymous path) → consults `feedback_moderation_rules` and may set status to `spam`/`rejected` automatically, logging to `feedback_moderation_log`.

All new tables: RLS on, business-member read, owner write, public read **only** through the SECURITY DEFINER RPC for the profile.

## 3. Edge functions

- `supabase/functions/get-maps-config/index.ts` — returns `{ browserKey }` to authenticated users only.
- `supabase/functions/geo-ingest/index.ts` — owner-only. Accepts `{ query, near }`, calls Google Places Text Search + Geocoding, dedupes, inserts into `geo_entities`. Rate-limited via `_shared/rate-limiter`.
- `supabase/functions/geo-rollup/index.ts` — recomputes `geo_insights_daily` for the caller's business (also schedulable).
- `supabase/functions/compute-health-score/index.ts` — wraps the SQL function, returns explainable breakdown.
- Extend `analyze-customer-sentiment` to also extract `keywords` (top 5) and accept an optional `geo_label`.

All functions: zod validation, JWT verification in code, CORS via `_shared/security-headers`, structured error responses.

## 4. Frontend

### 4a. Geo-Intelligence (`/geo`)

- New route + sidebar entry "Geo-Intel" (MapPin icon).
- `useGeoIntel` hook (locations, entities, daily insights, filters).
- `GeoOnboarding.tsx` — first-run wizard: pin primary location, set service radius, label key zones.
- `GeoDashboard.tsx` — split layout:
  - Left: Google Map (`@vis.gl/react-google-maps`) with business pin, service-radius circle, color-coded entity markers, heatmap overlay for customer clusters.
  - Right: filter panel + insight cards.
- **Advanced filters** (the user's specific ask):
  - Service radius slider (1–50 km) — filters which entities/insights show.
  - Geo label multi-select (chips from `geo_entities.geo_label` ∪ `business_locations.geo_label`).
  - Entity type multi-select (competitor, supplier, customer_cluster, event, landmark).
  - Date range (7/30/90d) — drives `geo_insights_daily` query.
- **Insight cards** react to filters: Opportunity Score (avg of filtered geo_labels), Competitor Density, Customer Reach, Top Performing Zone, Underserved Zones. Each card shows the contributing geo_labels so the user understands *why*.

### 4b. Public business profile (`/biz/:slug`)

- New public route, no auth.
- Pulls via `get_public_business_profile` RPC → no PII, no internal metrics leakage.
- Sections: hero (logo, tagline, primary location on mini-map), Health Score card with badge + transparent factor breakdown, Bundles grid (only `display_on_profile=true`), VoC Highlights (latest 6 approved positive/neutral submissions, anonymised), CTA (link to feedback form).
- Distinguished dark-blue theme (per existing memory) with shield badge and `Hongera` confetti on score milestones (already mentioned in earlier memory — reuse).
- Settings → new "Public Profile" tab to choose/validate slug, toggle visibility of each section, upload hero image to existing `business-assets` bucket.

### 4c. Feedback moderation rules (`/feedback`)

- New "Rules" tab on the Feedback page.
- Form (react-hook-form + zod): spam keyword chips, language block list (en/sw/sheng/other), min length, max links, sentiment thresholds (auto-reject < x, auto-approve > y), severity threshold, master enable.
- Live preview pane: paste sample message → shows which rule(s) would fire.
- Moderation queue gets new badges ("auto-flagged: spam_keyword", "auto-rejected: language=other") sourced from `feedback_moderation_log`.
- Bulk actions: approve all / reject all filtered.

### 4d. Wateja Sauti drill-down (Analytics tab)

- Extend `CustomerSentimentTab.tsx`:
  - Sentiment-over-time chart already exists — add toggle: stacked area vs 100% normalised.
  - Top themes & **keywords** clouds become clickable. Clicking a theme/keyword opens a side sheet with the matching messages, channel mix, geo_label distribution, and a sparkline of its frequency over the period.
  - Add a "Compare period" toggle (previous N days vs current) showing delta arrows on summary cards.
  - Add a CSV export of the filtered dataset (uses existing `lib/exportUtils`).

### 4e. Cross-cutting

- Sidebar: add Geo-Intel and Public Profile entries.
- Dashboard: add a small "Public profile views (7d)" tile and a "Health Score" preview linking to the explainer.

## 5. Security hardening pass

- Audit every new RLS policy with `supabase--linter` after migration; fix any ERROR/WARN before moving on.
- Public profile RPC: explicit allow-list of returned columns, no joins to PII tables.
- Maps browser key: HTTP-referrer-restricted in Google Cloud Console (documented in README); never inlined.
- Rate-limit `geo-ingest` (10/min/user) and the public profile RPC (60/min/IP via edge wrapper) to avoid scraping.
- Add zod validation everywhere new input is accepted (slugs, rules, filters).
- Add a Playwright spec: anonymous user can view a published profile but cannot read raw `business_locations` or `customer_sentiment_log` via REST (negative test).
- Run `security--run_security_scan` at the end and address findings; update `@security-memory` for anything intentionally public (the profile RPC).

## 6. Verification

- `supabase--linter` clean on new migration.
- New Playwright specs: geo dashboard filters, public profile rendering, moderation rule auto-reject path, anonymous PII denial.
- Manual smoke: end-to-end flow from setting moderation rules → submitting public feedback → seeing it auto-handled → analytics drill-down.
- Update `.lovable/plan.md` to mark Phase 2 done and lock the slug-validation + moderation-rule shapes for Phase 3+.

## Technical notes

- Map library: `@vis.gl/react-google-maps` (lighter, modern). Adds ~80KB gz; lazy-loaded only on `/geo` and `/biz/:slug` via `React.lazy`.
- Health score formula (initial): `overall = round(0.35*voc + 0.25*engagement + 0.25*inventory + 0.15*growth)` with each component normalised 0–100. Documented in-code and surfaced in the explainer UI.
- Moderation trigger runs BEFORE INSERT so rejected items still land (status=`spam`/`rejected`) for auditability rather than being silently dropped.
- All currency stays KES; all user-facing copy supports en/sw/sheng strings already present.

## Open decisions (defaults if you say "approved, defaults")

1. Public profile route: `/biz/:slug` (default) vs `/b/:slug` vs `/p/:slug`.
2. Health-score weighting: use the formula above (default) or let me expose weights as business settings.
3. Moderation default rule set on first run: conservative (only block obvious spam) — default — vs strict (block other-language + low-sentiment).
4. Confetti milestones: 60, 75, 90 (default) vs 50, 70, 85.

Reply "approved, defaults" to start, or tell me which to change and I'll begin Phase 2 immediately after secrets land.