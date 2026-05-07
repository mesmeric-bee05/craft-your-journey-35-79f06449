/**
 * Upload helper used by scripts/check-security-headers.ts and the
 * SECURITY DEFINER / storage role tests. POSTs a single row to
 * `security_check_runs` using the service role key so the in-app
 * Security Dashboard always shows the latest CI results.
 *
 * Required env vars (set in CI):
 *   SUPABASE_URL                — project URL
 *   SUPABASE_SERVICE_ROLE_KEY   — service role JWT
 *
 * Optional:
 *   SECURITY_CHECK_ENV          — defaults to 'staging'
 *   GITHUB_SHA                  — commit hash
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
      environment: process.env.SECURITY_CHECK_ENV || 'staging',
      status: payload.status,
      summary: payload.summary ?? null,
      results: payload.results ?? {},
      commit_sha: process.env.GITHUB_SHA || null,
      ran_by: process.env.GITHUB_ACTOR || 'ci',
    }),
  });
  if (!res.ok) {
    console.error(`[security-check-run] upload failed: ${res.status} ${await res.text()}`);
  }
}
