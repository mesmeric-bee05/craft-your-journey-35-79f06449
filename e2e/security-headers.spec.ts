import { test, expect, request } from '@playwright/test';

/**
 * Verifies CSP and friends on the deployed app.
 * Mirrors scripts/check-security-headers.ts but runs in CI as part of E2E.
 */
test('deployed app sets strong security headers', async ({ baseURL }) => {
  const ctx = await request.newContext();
  const res = await ctx.get(baseURL!);
  expect(res.ok()).toBeTruthy();

  const headers = res.headers();
  const csp = headers['content-security-policy'] ?? '';
  expect(csp, 'CSP header must be present').not.toEqual('');
  for (const directive of ['default-src', 'script-src', 'frame-ancestors', 'object-src']) {
    expect(csp, `CSP must include ${directive}`).toContain(directive);
  }
  // Strict mode: never allow 'unsafe-inline' on script-src
  expect(csp.match(/script-src[^;]*'unsafe-inline'/), "script-src must not allow 'unsafe-inline'").toBeNull();

  expect(headers['x-content-type-options']?.toLowerCase()).toBe('nosniff');
  expect(headers['referrer-policy'], 'Referrer-Policy must be set').toBeTruthy();
});
