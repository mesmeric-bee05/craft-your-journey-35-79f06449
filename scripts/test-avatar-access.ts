/**
 * Standalone runner for avatar-bucket checks (mirrors e2e/security/avatars-bucket.spec.ts).
 * Used by CI's storage-access job alongside test-storage-access.ts.
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL!;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const JWT = process.env.TEST_USER_JWT;
const USER = process.env.TEST_USER_ID;
const OTHER = process.env.TEST_OTHER_USER_ID;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'avatars';

if (!URL || !ANON) { console.error('❌ env missing'); process.exit(2); }

const anon = createClient(URL, ANON);
const svc = SVC ? createClient(URL, SVC) : null;
const auth = JWT ? createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${JWT}` } } }) : null;

let failures = 0;
const log = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const PIXEL = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,120,156,98,0,1,0,0,5,0,1,13,10,45,180,0,0,0,0,73,69,78,68,174,66,96,130]);

async function run() {
  console.log('📦 avatars bucket access matrix\n— Anonymous —');
  const { data: rootList } = await anon.storage.from(BUCKET).list('');
  log((rootList?.length ?? 0) === 0, 'anon list root denied/empty');

  const { data: uuidList } = await anon.storage.from(BUCKET).list('00000000-0000-0000-0000-000000000000');
  log((uuidList?.length ?? 0) === 0, 'anon list random UUID folder denied/empty');

  const { error: signErr, data: signData } = await anon.storage.from(BUCKET).createSignedUrl(
    '11111111-1111-1111-1111-111111111111/x.png', 60,
  );
  log(!!signErr || !signData?.signedUrl, 'anon createSignedUrl(foreign) denied');

  if (svc && USER) {
    const okPath = `${USER}/healthcheck.png`;
    await svc.storage.from(BUCKET).upload(okPath, PIXEL, { upsert: true, contentType: 'image/png' });
    const okUrl = svc.storage.from(BUCKET).getPublicUrl(okPath).data.publicUrl;
    const okRes = await fetch(okUrl);
    log(okRes.status === 200, 'public URL for UUID-foldered object → 200', `${okRes.status}`);
    await svc.storage.from(BUCKET).remove([okPath]);

    const badPath = `not-a-uuid/healthcheck.png`;
    await svc.storage.from(BUCKET).upload(badPath, PIXEL, { upsert: true, contentType: 'image/png' });
    const badUrl = svc.storage.from(BUCKET).getPublicUrl(badPath).data.publicUrl;
    const badRes = await fetch(badUrl);
    log(badRes.status >= 400, 'public URL for non-UUID folder → blocked', `${badRes.status}`);
    await svc.storage.from(BUCKET).remove([badPath]);
  }

  console.log('\n— Authenticated —');
  if (!auth || !USER) {
    console.log('ℹ️  skipped (TEST_USER_JWT/TEST_USER_ID not set)');
  } else {
    const ownPath = `${USER}/healthcheck.png`;
    const { error: upErr } = await auth.storage.from(BUCKET).upload(ownPath, PIXEL, { upsert: true, contentType: 'image/png' });
    log(!upErr, 'auth upload to own folder succeeds', upErr?.message);
    await auth.storage.from(BUCKET).remove([ownPath]);

    if (OTHER) {
      const otherPath = `${OTHER}/healthcheck.png`;
      const { error: fErr } = await auth.storage.from(BUCKET).upload(otherPath, PIXEL, { upsert: true, contentType: 'image/png' });
      log(!!fErr, 'auth upload to foreign folder denied', fErr?.message ?? 'unexpectedly succeeded');
    }
  }

  console.log(`\n${failures === 0 ? '✅ all checks passed' : `❌ ${failures} failed`}`);
  process.exit(failures > 0 ? 1 : 0);
}
run().catch((e) => { console.error(e); process.exit(2); });
