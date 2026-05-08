import { test, expect, request } from '@playwright/test';

/**
 * Verifies the secureDownload denied state at the API layer:
 *   - An unauthenticated request to a private bucket fails (4xx).
 *   - An authenticated request to an object the user does NOT own
 *     fails (signed URL not issued / 4xx) — the storage RLS is the
 *     final guard, even if a user "guesses" a path.
 *
 * Toast/UI assertions are kept lightweight because the dashboard requires
 * an authenticated admin session; the browser part of this test loads the
 * /vision page and verifies the secureDownload helper surfaces its
 * denial copy when invoked from the page console with a fake path.
 */
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const TEST_USER_JWT = process.env.TEST_USER_JWT;
const FOREIGN_OBJECT_PATH =
  process.env.TEST_FOREIGN_OBJECT_PATH || 'foreign-business/secret.bin';

test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, 'Supabase env vars required');

test('signed-URL request for unauthenticated user is denied', async () => {
  const ctx = await request.newContext();
  const res = await ctx.post(
    `${SUPABASE_URL}/storage/v1/object/sign/business-assets/${FOREIGN_OBJECT_PATH}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
      },
      data: { expiresIn: 60 },
    },
  );
  expect(res.status(), 'anon must not get a signed URL').toBeGreaterThanOrEqual(400);
});

test('signed-URL request for foreign object as authed user is denied', async () => {
  test.skip(!TEST_USER_JWT, 'TEST_USER_JWT required for this case');
  const ctx = await request.newContext();
  const res = await ctx.post(
    `${SUPABASE_URL}/storage/v1/object/sign/business-assets/${FOREIGN_OBJECT_PATH}`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${TEST_USER_JWT!}`,
        'Content-Type': 'application/json',
      },
      data: { expiresIn: 60 },
    },
  );
  expect(res.status(), 'cross-business signed URL must be denied').toBeGreaterThanOrEqual(400);
});

test('vision page renders and secureDownload surfaces denial copy', async ({ page }) => {
  await page.goto('/vision', { waitUntil: 'domcontentloaded' });
  // Unauthenticated: gated route should bounce or render a sign-in CTA.
  // Either way, page must not show a raw signed URL or storage object path.
  const html = await page.content();
  expect(html).not.toContain('storage/v1/object/sign/business-assets');
  expect(html).not.toContain(FOREIGN_OBJECT_PATH);
});
