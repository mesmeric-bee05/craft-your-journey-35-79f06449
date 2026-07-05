# SACCO Integration Portal

Full slice: partner API sync + public onboarding + admin console. Scoped to ship in one approval cycle, with the partner API as a separate follow-up commit if it grows too large.

## What ships

1. **Admin console** at `/admin/saccos` — searchable table of all SACCOs, filters by county/region/size, LOI status column, "Import CSV" action, drill-down page per SACCO.
2. **CSV import** — upload SACCOs and members (two templates). Client validates → Edge Function dedupes by registration number/phone → results toast.
3. **Member linkage** — a SACCO member with a Kenyan phone can be invited to claim a SmartReach business; invited members show up as pending until they sign up with the same phone.
4. **Public partner page** at `/partners/saccos` — pitch, LOI count, "Apply to integrate" form (writes to `sacco_applications`).
5. **Partner sync API** — Edge Function `sacco-sync` accepts POST/PUT of members via an API key issued per SACCO. Handles create/update/soft-delete, returns per-row status.
6. **Per-SACCO dashboard** — member count, active claimed businesses, recent imports, sync activity log.

## Data model

```text
saccos                    partner SACCO organizations
  id, name, registration_no (unique), county, region,
  member_count_estimate, loi_status (none|signed|active),
  contact_email, contact_phone, tier (starter|growth|enterprise),
  api_key_hash, api_key_last4, created_by (admin)

sacco_members             one row per member imported / synced
  id, sacco_id, external_member_id, full_name,
  phone (indexed), email, joined_at,
  claimed_business_id (nullable → businesses.id),
  status (imported|invited|claimed|inactive),
  metadata jsonb

sacco_imports             audit trail of each CSV/API import
  id, sacco_id, source (csv|api|manual), imported_by,
  row_count, created_count, updated_count, error_count,
  errors jsonb, started_at, finished_at

sacco_applications        public /partners/saccos submissions
  id, sacco_name, county, member_count_estimate,
  contact_name, contact_email, contact_phone,
  message, status (new|reviewing|approved|rejected)
```

### Access rules (plain English)
- **Admins** can read/write everything.
- **Authenticated users** can read a SACCO's public directory info (name, county, size band) but NOT member rosters.
- **SACCO members** can read only their own `sacco_members` row (matched by their signed-in phone).
- **Anonymous visitors** can INSERT into `sacco_applications` (rate-limited) but not read.
- Partner API bypasses RLS by running in an Edge Function with `service_role`, but validates the SACCO API key first.

## Edge Functions

- `sacco-import` (JWT required, admin only) — accepts a parsed CSV JSON payload, dedupes, writes to `sacco_members` + `sacco_imports`.
- `sacco-sync` (no JWT; validates `X-Sacco-Api-Key` header) — partner endpoint for programmatic member upserts.
- `sacco-issue-api-key` (admin only) — generates a random key, stores only the hash + last4, returns the plaintext once.

## UI

- `src/pages/admin/SaccoAdmin.tsx` — list, filters, import dialog, drill-down.
- `src/pages/admin/SaccoDetail.tsx` — members table (paginated, phone masked), imports log, API key management.
- `src/pages/partners/SaccosPublic.tsx` — public marketing + application form.
- `src/components/saccos/CsvImportDialog.tsx` — file picker, live validation (Zod), progress, error table.
- Nav entry under Admin section.

## Out of scope (explicit)
- No M-Pesa reconciliation for SACCOs (separate roadmap item).
- No SACCO-owned loan products (that's the SmartReach Capital plan).
- No SMS blast to imported members yet — invites are one-tap manual for the first release.

## Technical notes
- CSV parsing client-side via a lightweight parser (no new heavy dep); server re-validates.
- Phone normalization: strip formatting, ensure `+254` prefix, reject invalid.
- Rate-limit `sacco-sync` per API key (in-function token bucket in a `sacco_api_rate_limits` table).
- Reuse existing `check_and_record_admin_action` for admin-triggered imports.
- Follow existing memory rules: strict RLS, Zod validation, `service_role` GRANT on new tables, `update_updated_at_column` triggers.

## Files to add
- 1 migration (~200 lines): tables + GRANTs + RLS + triggers.
- 3 edge functions.
- 4 new pages/components + 1 hook (`useSaccos`, `useSaccoMembers`).
- 1 route registration in `App.tsx`.
