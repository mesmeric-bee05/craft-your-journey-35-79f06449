/**
 * Storage access tests for the locked `business-assets` bucket.
 *
 * Confirms:
 *  - anonymous list() is empty/denied
 *  - anonymous download() is denied
 *  - authenticated business member can list/download their own folder
 *  - authenticated user cannot download another business's folder
 *
 * Required env:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 *   TEST_USER_JWT
 *   TEST_BUSINESS_ID         (folder name == business id)
 *   TEST_OTHER_BUSINESS_ID   (a folder this user does NOT own)
 *   SUPABASE_SERVICE_ROLE_KEY (optional — used to seed/cleanup a fixture)
 *
 * Usage: bun scripts/test-storage-access.ts
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL!;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const JWT = process.env.TEST_USER_JWT;
const OWN = process.env.TEST_BUSINESS_ID;
const OTHER = process.env.TEST_OTHER_BUSINESS_ID;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = 'business-assets';
const FIXTURE = '__healthcheck.txt';

if (!URL || !ANON) {
  console.error('❌ VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required');
  process.exit(2);
}

const anon = createClient(URL, ANON);
const auth = JWT
  ? createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${JWT}` } } })
  : null;
const svc = SVC ? createClient(URL, SVC) : null;

let failures = 0;
const log = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function seed(path: string) {
  if (!svc) return false;
  const { error } = await svc.storage
    .from(BUCKET)
    .upload(path, new Blob(['ok'], { type: 'text/plain' }), { upsert: true });
  if (error) {
    console.warn('⚠️  Seed failed:', error.message);
    return false;
  }
  return true;
}

async function cleanup(path: string) {
  if (!svc) return;
  await svc.storage.from(BUCKET).remove([path]);
}

async function run() {
  console.log(`📦 Storage tests against ${BUCKET}\n`);

  // ── Anonymous ──────────────────────────────────────────────────────────
  console.log('— Anonymous client —');
  const { data: anonList, error: anonListErr } = await anon.storage.from(BUCKET).list('');
  log(
    !!anonListErr || (Array.isArray(anonList) && anonList.length === 0),
    'anon list() denied or empty',
    anonListErr?.message ?? `${anonList?.length ?? 0} entries`,
  );

  const probePath = OWN ? `${OWN}/${FIXTURE}` : FIXTURE;
  const { error: anonDlErr } = await anon.storage.from(BUCKET).download(probePath);
  log(!!anonDlErr, 'anon download() denied', anonDlErr?.message ?? 'unexpectedly succeeded');

  // ── Authenticated ──────────────────────────────────────────────────────
  if (!auth || !OWN) {
    console.log('\nℹ️  TEST_USER_JWT/TEST_BUSINESS_ID not set — skipping authenticated checks.');
    process.exit(failures > 0 ? 1 : 0);
  }

  const ownPath = `${OWN}/${FIXTURE}`;
  const seeded = await seed(ownPath);

  console.log('\n— Authenticated business member —');
  const { data: ownList, error: ownListErr } = await auth.storage.from(BUCKET).list(OWN);
  log(!ownListErr, `auth list(${OWN}) succeeds`, ownListErr?.message ?? `${ownList?.length ?? 0} entries`);

  if (seeded) {
    const { data: ownDl, error: ownDlErr } = await auth.storage.from(BUCKET).download(ownPath);
    log(!ownDlErr && !!ownDl, `auth download(own) succeeds`, ownDlErr?.message ?? 'ok');
  }

  if (OTHER) {
    const { error: otherDlErr } = await auth.storage
      .from(BUCKET)
      .download(`${OTHER}/${FIXTURE}`);
    log(!!otherDlErr, 'auth download(other business) denied', otherDlErr?.message ?? 'unexpectedly succeeded');
  }

  if (seeded) await cleanup(ownPath);

  console.log(`\n${failures === 0 ? '✅ All checks passed' : `❌ ${failures} check(s) failed`}`);
  process.exit(failures > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Unhandled error:', e);
  process.exit(2);
});
