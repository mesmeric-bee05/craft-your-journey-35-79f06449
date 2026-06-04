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
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | both Supabase scripts + Playwright |
| `TEST_USER_JWT` | both Supabase scripts (a fresh user access token) |
| `TEST_BUSINESS_ID` | both Supabase scripts |
| `TEST_OTHER_BUSINESS_ID` | cross-tenant checks |
| `SUPABASE_SERVICE_ROLE_KEY` | storage fixture seed + uploading run rows |
| `SECURITY_ALERT_SHARED_SECRET` | uploading run rows fires the `security-alert` edge function on `fail` |
| `SECURITY_CHECK_ENV` | optional label, defaults to `staging` |

## Failure alerts (`security-alert` edge function)

When a run is uploaded with `status === 'fail'`, `scripts/lib/uploadCheckRun.ts`
calls the `security-alert` edge function. Configure these runtime secrets in
Lovable Cloud:

- `SECURITY_ALERT_SHARED_SECRET` — required, must match the CI secret.
- `SECURITY_ALERT_EMAILS` — comma-separated admin emails (optional).
- `SECURITY_ALERT_FROM` — sender address (optional, defaults to `alerts@onresend.dev`).
- `RESEND_API_KEY` — required for email delivery.
- `SECURITY_ALERT_WEBHOOK_URL` — optional Slack/Discord-compatible webhook.


## `test-avatar-access.ts`

Validates the public `avatars` bucket access matrix: anon may read
UUID-foldered objects via public URL (intentional, for `<img>` rendering)
but must NOT list, read non-UUID folders, or sign URLs for foreign folders.
Authed users may only write to their own `auth.uid()` folder.

```bash
VITE_SUPABASE_URL=... \
VITE_SUPABASE_PUBLISHABLE_KEY=... \
TEST_USER_JWT=... \
TEST_USER_ID=... \
TEST_OTHER_USER_ID=... \
SUPABASE_SERVICE_ROLE_KEY=... \
bun scripts/test-avatar-access.ts
```

## Branch protection

The `Security Checks` workflow exposes a `required-checks` aggregator job
that succeeds only when every upstream security job passed (or was
intentionally skipped). Mark **`required-checks`** as a required status
check on the default branch — do NOT mark the individual jobs, because
some run conditionally on optional `TEST_USER_JWT` secrets.
