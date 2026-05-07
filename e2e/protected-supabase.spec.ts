import { test, expect, request } from '@playwright/test';

/**
 * Verifies that protected Supabase storage and SECURITY DEFINER RPCs
 * cannot be reached anonymously from the deployed app's public API.
 *
 * Reads SUPABASE URL + anon key from VITE_ env vars (matching the app build).
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'Supabase env vars required');

test('anonymous user cannot list business-assets bucket', async () => {
  const ctx = await request.newContext();
  const res = await ctx.post(`${SUPABASE_URL}/storage/v1/object/list/business-assets`, {
    headers: { apikey: SUPABASE_ANON_KEY!, Authorization: `Bearer ${SUPABASE_ANON_KEY!}` },
    data: { prefix: '', limit: 100 },
  });
  // Either explicit 4xx, or empty list — never expose paths
  if (res.ok()) {
    const body = await res.json();
    expect(Array.isArray(body) ? body.length : 0, 'public listing must be empty').toBe(0);
  } else {
    expect([400, 401, 403, 404]).toContain(res.status());
  }
});

test('anonymous user cannot download from business-assets', async () => {
  const ctx = await request.newContext();
  const res = await ctx.get(`${SUPABASE_URL}/storage/v1/object/business-assets/protected/file.bin`, {
    headers: { apikey: SUPABASE_ANON_KEY! },
  });
  expect(res.status(), 'must be 4xx').toBeGreaterThanOrEqual(400);
});

test('anonymous user cannot call SECURITY DEFINER RPCs', async () => {
  const ctx = await request.newContext();
  const targets = ['get_csat_metrics', 'get_sla_metrics', 'log_user_action'];
  for (const fn of targets) {
    const res = await ctx.post(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
      data: { p_business_id: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status(), `${fn} must reject anon`).toBeGreaterThanOrEqual(400);
  }
});
