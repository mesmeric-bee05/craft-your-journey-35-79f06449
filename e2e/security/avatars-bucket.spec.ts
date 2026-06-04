/**
 * Avatar bucket access matrix.
 *
 * Avatars is intentionally PUBLIC for <img> rendering, but with a tightened
 * RLS policy that only exposes UUID-foldered objects.
 *
 *  | actor       | list root | list /<uuid>/ | read public URL | upload own | upload other | delete other |
 *  | ----------- | --------- | ------------- | --------------- | ---------- | ------------ | ------------ |
 *  | anonymous   | ❌        | ❌            | ✅ (UUID path)  | ❌         | ❌           | ❌           |
 *  | authed user | ❌        | ❌            | ✅              | ✅         | ❌           | ❌           |
 *
 * Optional env (skipped if missing):
 *   TEST_USER_JWT           — authed user JWT
 *   TEST_USER_ID            — that user's auth.uid (UUID folder name)
 *   TEST_OTHER_USER_ID      — a different UUID folder the user does NOT own
 *   SUPABASE_SERVICE_ROLE_KEY — seeds a fixture under TEST_USER_ID/ so the
 *                               public-URL read assertion can be exercised
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL ?? '';
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const JWT = process.env.TEST_USER_JWT ?? '';
const USER = process.env.TEST_USER_ID ?? '';
const OTHER = process.env.TEST_OTHER_USER_ID ?? '';
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const BUCKET = 'avatars';
const FIXTURE = 'e2e-fixture.png';
const PIXEL = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

test.describe('avatars bucket — anonymous', () => {
  test.skip(!URL || !ANON, 'Supabase env not set');
  const anon = createClient(URL, ANON);

  test('anon list root → denied/empty', async () => {
    const { data } = await anon.storage.from(BUCKET).list('');
    expect(data?.length ?? 0).toBe(0);
  });

  test('anon list random UUID folder → denied/empty', async () => {
    const { data } = await anon.storage.from(BUCKET).list('00000000-0000-0000-0000-000000000000');
    expect(data?.length ?? 0).toBe(0);
  });

  test('anon signed-URL for foreign folder → denied', async () => {
    const { data, error } = await anon.storage.from(BUCKET).createSignedUrl(
      '11111111-1111-1111-1111-111111111111/anything.png', 60,
    );
    expect(!!error || !data?.signedUrl).toBeTruthy();
  });

  test('anon public-URL fetch of UUID-foldered object is reachable', async () => {
    test.skip(!SVC || !USER, 'SUPABASE_SERVICE_ROLE_KEY and TEST_USER_ID required');
    const svc = createClient(URL, SVC);
    const path = `${USER}/${FIXTURE}`;
    await svc.storage.from(BUCKET).upload(path, PIXEL, { upsert: true, contentType: 'image/png' });
    const { data } = svc.storage.from(BUCKET).getPublicUrl(path);
    const res = await fetch(data.publicUrl);
    expect(res.status, 'public UUID-foldered object must render via <img>').toBe(200);
    await svc.storage.from(BUCKET).remove([path]);
  });

  test('anon public-URL fetch of NON-UUID-foldered object is blocked', async () => {
    test.skip(!SVC, 'SUPABASE_SERVICE_ROLE_KEY required');
    const svc = createClient(URL, SVC);
    const badPath = `not-a-uuid/${FIXTURE}`;
    await svc.storage.from(BUCKET).upload(badPath, PIXEL, { upsert: true, contentType: 'image/png' });
    const { data } = svc.storage.from(BUCKET).getPublicUrl(badPath);
    const res = await fetch(data.publicUrl);
    expect(res.status, 'non-UUID folder must NOT be publicly readable').toBeGreaterThanOrEqual(400);
    await svc.storage.from(BUCKET).remove([badPath]);
  });
});

test.describe('avatars bucket — authenticated', () => {
  test.skip(!URL || !ANON || !JWT || !USER, 'TEST_USER_JWT/TEST_USER_ID required');
  const auth = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${JWT}` } } });

  test('authed user can upload to own UUID folder', async () => {
    const path = `${USER}/${FIXTURE}`;
    const { error } = await auth.storage.from(BUCKET).upload(path, PIXEL, { upsert: true, contentType: 'image/png' });
    expect(error, error?.message).toBeNull();
    await auth.storage.from(BUCKET).remove([path]);
  });

  test('authed user CANNOT upload to another user folder', async () => {
    test.skip(!OTHER, 'TEST_OTHER_USER_ID required');
    const path = `${OTHER}/${FIXTURE}`;
    const { error } = await auth.storage.from(BUCKET).upload(path, PIXEL, { upsert: true, contentType: 'image/png' });
    expect(error, 'foreign-folder upload must be denied').not.toBeNull();
  });

  test('authed user CANNOT delete another user object', async () => {
    test.skip(!OTHER || !SVC, 'TEST_OTHER_USER_ID and SUPABASE_SERVICE_ROLE_KEY required');
    const svc = createClient(URL, SVC);
    const path = `${OTHER}/${FIXTURE}`;
    await svc.storage.from(BUCKET).upload(path, PIXEL, { upsert: true, contentType: 'image/png' });
    const { error } = await auth.storage.from(BUCKET).remove([path]);
    expect(error || true, 'remove should fail or be a no-op').toBeTruthy();
    // Verify object still exists via service role
    const { data: stillThere } = await svc.storage.from(BUCKET).download(path);
    expect(stillThere, 'foreign object must not be deleted by another user').not.toBeNull();
    await svc.storage.from(BUCKET).remove([path]);
  });
});
