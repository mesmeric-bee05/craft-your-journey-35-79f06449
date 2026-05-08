/**
 * Upload helper used by scripts/check-security-headers.ts and the
 * SECURITY DEFINER / storage role tests. POSTs a single row to
 * `security_check_runs` using the service role key so the in-app
 * Security Dashboard always shows the latest CI results.
 *
 * On `fail` (or `warn`) it also fires the `security-alert` edge function
 * so admins get an email/webhook notification immediately.
 *
 * Required env vars (set in CI):
 *   SUPABASE_URL                — project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — service role JWT
 *
 * Optional:
 *   SECURITY_CHECK_ENV          — defaults to 'staging'
 *   GITHUB_SHA                  — commit hash
 *   GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID — used to build run_url
 *   SECURITY_ALERT_SHARED_SECRET — required to fire alerts
 */
export async function uploadSecurityCheckRun(payload: {
  check_type: 'headers' | 'rpc_roles' | 'storage';
  status: 'pass' | 'fail' | 'warn';
  summary?: string;
  results?: Record<string, unknown>;
}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn('[security-check-run] skipping upload — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    return;
  }
  const environment = process.env.SECURITY_CHECK_ENV || 'staging';
  const commit_sha = process.env.GITHUB_SHA || null;

  const res = await fetch(`${url}/rest/v1/security_check_runs`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      check_type: payload.check_type,
      environment,
      status: payload.status,
      summary: payload.summary ?? null,
      results: payload.results ?? {},
      commit_sha,
      ran_by: process.env.GITHUB_ACTOR || 'ci',
    }),
  });
  if (!res.ok) {
    console.error(`[security-check-run] upload failed: ${res.status} ${await res.text()}`);
    return;
  }

  // Fire alert on non-pass results.
  if (payload.status === 'pass') return;
  const alertSecret = process.env.SECURITY_ALERT_SHARED_SECRET;
  if (!alertSecret) {
    console.warn('[security-check-run] alert skipped — SECURITY_ALERT_SHARED_SECRET not set');
    return;
  }
  const runUrl =
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null;
  try {
    const alertRes = await fetch(`${url}/functions/v1/security-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-alert-secret': alertSecret,
      },
      body: JSON.stringify({
        check_type: payload.check_type,
        status: payload.status,
        environment,
        summary: payload.summary ?? null,
        commit_sha,
        run_url: runUrl,
      }),
    });
    if (!alertRes.ok) {
      console.error(`[security-check-run] alert failed: ${alertRes.status} ${await alertRes.text()}`);
    }
  } catch (err) {
    console.error('[security-check-run] alert threw:', err);
  }
}
