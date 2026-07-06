## Scope

Four focused fixes/features, sequenced to keep the build green throughout. All work is frontend + typing only unless noted; no schema changes.

### 1. Fix `offer_snapshot` typing in Capital admin

- Add a typed row shape in `useCapital.tsx`:
  - `export interface CapitalApplicationRow { id; business_id; requested_amount_kes; revenue_share_pct; factor; total_repayment_kes; status; created_at; esign_name; offer_snapshot: OfferSnapshot | null; businesses: { name: string } | null; }`
  - `OfferSnapshot = { score?: number; monthly_gmv_kes?: number; business_age_days?: number }`
- `useCapitalAdminQueue` returns `CapitalApplicationRow[]` via a cast at the query boundary (`(data ?? []) as CapitalApplicationRow[]`), since `offer_snapshot` is `Json` in generated types.
- Remove the inline `(queue as Array<...>)` cast in `CapitalAdmin.tsx`; iterate the typed rows directly. Filtering/sorting helpers (status filter, newest-first sort) now compile against the typed shape.

### 2. Loading / empty / error states for `/admin/capital`

- Destructure `isLoading, isError, error, refetch` from `useCapitalAdminQueue`.
- Add:
  - Skeleton cards (3x) while loading.
  - Error card with message + "Retry" button calling `refetch()`.
  - Empty state card (icon + copy) when queue is empty.
- Approve/Reject buttons: disable while that specific row's mutation is pending (track pending id), show inline spinner. Replace `alert()` with a `toast.error` for missing rejection note. Toast success/failure already handled in hooks.
- Add a simple status filter (Submitted / Under review / All) and sort toggle (Oldest / Newest) — pure client-side over the typed rows.

### 3. SACCO CSV import: preview, validation, dedupe, errors

In `SaccoDetail.tsx` + `useSaccos.tsx`:

- Extract a `validateCsvRows(rows)` util returning `{ valid, invalid }` where each invalid row has `{ rowNumber, reasons[] }`. Rules:
  - `full_name` required, ≤120 chars.
  - `phone` optional; if present must normalize to `+2547XXXXXXXX` or `+2541XXXXXXXX` (reuse existing `norm`).
  - `email` optional; must match basic email regex, ≤255 chars.
  - `joined_at` optional; must parse as ISO date.
  - `external_member_id` optional; ≤64 chars.
- Client-side dedupe by `external_member_id` (or `phone` fallback) within the file; duplicates flagged as warnings, not errors, keeping the first occurrence.
- Import dialog upgraded:
  - Full preview table (scrollable, first 50 rows) with per-row status badges: Valid / Warning / Error + tooltip listing reasons.
  - Summary bar: `X valid · Y warnings · Z errors · N duplicates skipped`.
  - "Download errors CSV" button generates a CSV of invalid rows with a `_errors` column.
  - Import button disabled unless `valid > 0`; only valid rows are sent.
- `useImportSaccoMembersCSV` returns per-batch `{ created, updated, skipped, errors: [{row, error}] }`; the toast on completion reads `Imported X · Skipped Y · Failed Z`, and errors are surfaced in a post-import result panel with a "Download failed rows" button.

### 4. Offline test mode for the IndexedDB outbox

- New route `/settings/offline-test` (dev + admin only; hidden behind a `NODE_ENV !== 'production' || hasRole('admin')` guard).
- Page (`src/pages/OfflineTest.tsx`) UI:
  - Current online/offline status pill (reuse `useOnlineStatus`).
  - Buttons to enqueue synthetic outbox items of each `OutboxKind` (registers no-op handlers that simulate success, transient failure — fails first N attempts — or permanent failure).
  - Live outbox table: id, kind, attempts, lastError, createdAt (via `listOutbox` + subscription).
  - "Simulate offline" toggle that intercepts `flushOutbox` (sets an in-module flag) and a "Force flush" button.
  - Retry progress bar showing `processed / total` during a flush cycle.
- Small additions to `src/pwa/outbox.ts`:
  - Export a `flushProgress` subscription (`{ processed, failed, total, running }`) updated inside `flushOutbox`.
  - Add `registerOutboxHandler` for the three synthetic kinds only when the test page mounts (cleanup on unmount).
- No production behavior change; existing auto-flush on `online` still works.

### 5. Continue phase-by-phase build hygiene

After each of the four items above:

- Run tsgo/build, fix any type errors surfaced by the new typed rows or hook signatures.
- Grep for other `offer_snapshot` / `capital_applications` consumers and align them to `CapitalApplicationRow` if needed.
- Update `mem://features/smartreach-capital` note with the new typed row + admin UX states, and `mem://features/sacco-integration-portal` with the new import validation contract, and `mem://features/offline-first-pwa` with the offline test mode route.

## Out of scope

- No database migrations, no edge function changes, no live M-Pesa / partner webhook work (still deferred per prior turn).
- No redesign of Capital user page or SACCO admin list.

## Technical notes

- `offer_snapshot` remains `Json` in generated Supabase types; the typed row is a boundary cast, not a schema change.
- Validation uses zod-free hand-written checks to keep the CSV path dependency-light; matches existing `norm` helper.
- Outbox test handlers must be registered lazily to avoid overriding real handlers when the test page isn't mounted.
