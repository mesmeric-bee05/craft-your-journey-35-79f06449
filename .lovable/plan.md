## Plan: Vision slider polish + automated security verification

### 1. Vision before/after slider — accessibility & persistence

**`src/components/ui/before-after-slider.tsx`**
- Promote the handle to the primary interactive element: add `role="slider"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow={position}`, `aria-label` (configurable, default "Before/after comparison").
- Move keyboard handling from the inner button onto the container with `tabIndex={0}`, supporting `←/→` (±5), `Shift+←/→` (±10), `Home` (0), `End` (100), `PageUp/PageDown` (±25).
- Add visible focus ring on the handle, `aria-hidden` decorative chevrons, and `<span className="sr-only">` live text announcing `{position}% revealed`.
- New optional props: `ariaLabel?: string`, `onPositionChange?: (n: number) => void`, `initialPosition?: number`.

**`src/hooks/useUserSettings.tsx`** (already exists)
- Confirm shape; add a typed helper `visionCompareDefault: boolean` reading/writing from the existing JSON settings blob (no schema change needed — `user_settings.preferences` JSONB already in use).

**`src/pages/Vision.tsx`**
- Initialise `compareMode` from `userSettings.preferences.vision_compare_default` and persist on toggle (debounced upsert).
- Pass `ariaLabel="Compare original product photo with AI-enhanced result"` and wire `onPositionChange` for analytics-friendly logging (console only for now).

### 2. Supabase SECURITY DEFINER role test script

**New file: `scripts/test-security-definer-roles.ts`** (Bun + `@supabase/supabase-js`)
- Reads `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (anon), and a test user JWT from env (`TEST_USER_JWT`, optional `TEST_OTHER_BUSINESS_ID`).
- For each protected RPC (`get_csat_metrics`, `get_csat_by_channel`, `get_csat_by_agent`, `get_sla_metrics`, `get_safe_channels`, `get_channel_tokens`, `get_stream_credentials`, `get_customer_masked`, `log_security_event`):
  - **Anon client** call → expect failure (`PGRST301`/`42501`/permission-denied). Pass = denied.
  - **Authenticated client** call with a `business_id` the user does NOT belong to → expect `insufficient_privilege`. Pass = denied.
  - **Authenticated client** call with the user's own `business_id` → expect success or empty rows.
- Prints a `✅/❌` matrix and exits non-zero on any unexpected result. Safe to run in CI nightly.

### 3. business-assets storage bucket access tests

**New file: `scripts/test-storage-access.ts`** (Bun)
- Anon client:
  - `supabase.storage.from('business-assets').list('')` → expect error or empty (listing disabled).
  - `supabase.storage.from('business-assets').download('<known-test-path>')` → expect 403/404.
  - `supabase.storage.from('business-assets').createSignedUrl(...)` → expect denied.
- Authenticated client (business member, via `TEST_USER_JWT`):
  - `list()` scoped to their own folder → expect success.
  - `download()` of a seeded fixture → expect success.
  - `download()` of another business's path → expect denied.
- Optional setup step: upload a tiny `__healthcheck.txt` under the test user's business folder using service-role key (only when `SUPABASE_SERVICE_ROLE_KEY` is provided), then clean it up.
- Exits non-zero on any unexpected outcome.

### 4. CI security-headers gate

**New file: `.github/workflows/security-checks.yml`**
- Triggers: `pull_request` and `workflow_dispatch`; also on push to `main` post-deploy.
- Job `security-headers`:
  ```
  - uses: actions/checkout@v4
  - uses: oven-sh/setup-bun@v2
  - run: bun install --frozen-lockfile
  - name: Verify staging security headers
    env:
      STAGING_URL: ${{ secrets.STAGING_URL }}
    run: bun scripts/check-security-headers.ts "$STAGING_URL"
  ```
- Job `security-definer-roles` (optional, runs only when secrets present):
  ```
  - run: bun scripts/test-security-definer-roles.ts
    env:
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
      TEST_USER_JWT: ${{ secrets.TEST_USER_JWT }}
      TEST_BUSINESS_ID: ${{ secrets.TEST_BUSINESS_ID }}
      TEST_OTHER_BUSINESS_ID: ${{ secrets.TEST_OTHER_BUSINESS_ID }}
  ```
- Job `storage-access`: same pattern, runs `scripts/test-storage-access.ts`.
- Each step has `continue-on-error: false` so a missing/weaker CSP fails the PR.

**`scripts/check-security-headers.ts` upgrade**
- Add a `--strict` flag (default in CI) that also fails when CSP is missing `default-src 'self'`, allows `'unsafe-inline'` for `script-src`, or omits `frame-ancestors`.
- Ensure non-zero exit propagates (already does).

### Files

**Create (4):**
- `scripts/test-security-definer-roles.ts`
- `scripts/test-storage-access.ts`
- `.github/workflows/security-checks.yml`
- (Optional) `scripts/README.md` — documents required env vars / GitHub secrets

**Modify (3):**
- `src/components/ui/before-after-slider.tsx` — a11y + keyboard
- `src/pages/Vision.tsx` — persistence wiring
- `scripts/check-security-headers.ts` — `--strict` mode

**No DB migrations, no new dependencies** (`@supabase/supabase-js` already installed; Bun is the script runner).

### Required GitHub secrets (user action)
`STAGING_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `TEST_USER_JWT`, `TEST_BUSINESS_ID`, `TEST_OTHER_BUSINESS_ID`, optional `SUPABASE_SERVICE_ROLE_KEY` for storage seeding.
