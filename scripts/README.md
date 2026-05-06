# Security verification scripts

All scripts are Bun-runnable and exit non-zero on failure (CI-friendly).

## `check-security-headers.ts`

Validates response headers + `<meta http-equiv>` tags on a deployed URL.

```bash
bun scripts/check-security-headers.ts https://staging.example.com           # default mode
bun scripts/check-security-headers.ts https://staging.example.com --strict  # CI mode
```

**Strict mode additionally fails when:**
- CSP is missing `default-src 'self'`
- CSP `script-src` allows `'unsafe-inline'`
- CSP omits `frame-ancestors`

## `test-security-definer-roles.ts`

Confirms business-scoped RPCs deny anon callers and cross-tenant access.

```bash
VITE_SUPABASE_URL=... \
VITE_SUPABASE_PUBLISHABLE_KEY=... \
TEST_USER_JWT=... \
TEST_BUSINESS_ID=... \
TEST_OTHER_BUSINESS_ID=... \
bun scripts/test-security-definer-roles.ts
```

## `test-storage-access.ts`

Confirms the `business-assets` bucket blocks anon access and enforces
per-business folder isolation. Optionally seeds a fixture when
`SUPABASE_SERVICE_ROLE_KEY` is provided.

```bash
VITE_SUPABASE_URL=... \
VITE_SUPABASE_PUBLISHABLE_KEY=... \
TEST_USER_JWT=... \
TEST_BUSINESS_ID=... \
TEST_OTHER_BUSINESS_ID=... \
SUPABASE_SERVICE_ROLE_KEY=... \
bun scripts/test-storage-access.ts
```

## Required GitHub Actions secrets

| Secret | Used by |
|---|---|
| `STAGING_URL` | headers gate |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | both Supabase scripts |
| `TEST_USER_JWT` | both Supabase scripts (a fresh user access token) |
| `TEST_BUSINESS_ID` | both Supabase scripts |
| `TEST_OTHER_BUSINESS_ID` | cross-tenant checks |
| `SUPABASE_SERVICE_ROLE_KEY` | storage fixture seed (optional) |
