/**
 * Role-based smoke test for SECURITY DEFINER RPCs.
 *
 * Confirms that:
 *  - anon callers are denied
 *  - authenticated callers cannot read other businesses
 *  - authenticated callers can read their own business
 *
 * Required env:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_PUBLISHABLE_KEY
 *   TEST_USER_JWT          (a freshly signed-in user's access_token)
 *   TEST_BUSINESS_ID       (a business this user belongs to)
 *   TEST_OTHER_BUSINESS_ID (a business this user does NOT belong to)
 *
 * Usage: bun scripts/test-security-definer-roles.ts
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL!;
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const JWT = process.env.TEST_USER_JWT;
const OWN = process.env.TEST_BUSINESS_ID;
const OTHER = process.env.TEST_OTHER_BUSINESS_ID;

if (!URL || !ANON) {
  console.error('❌ VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required');
  process.exit(2);
}

const anon = createClient(URL, ANON);
const auth = JWT
  ? createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${JWT}` } } })
  : null;

interface Case {
  name: string;
  fn: string;
  args: Record<string, unknown>;
}

const BUSINESS_RPCS: Case[] = OWN
  ? [
      { name: 'get_csat_metrics', fn: 'get_csat_metrics', args: { p_business_id: OWN } },
      { name: 'get_csat_by_channel', fn: 'get_csat_by_channel', args: { p_business_id: OWN } },
      { name: 'get_csat_by_agent', fn: 'get_csat_by_agent', args: { p_business_id: OWN } },
      { name: 'get_sla_metrics', fn: 'get_sla_metrics', args: { p_business_id: OWN } },
      { name: 'get_safe_channels', fn: 'get_safe_channels', args: { p_business_id: OWN } },
    ]
  : [];

let failures = 0;
const log = (ok: boolean, label: string, detail = '') => {
  console.log(`${ok ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const isDenied = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  const msg = (e.message ?? '').toLowerCase();
  return (
    e.code === '42501' ||
    e.code === 'PGRST301' ||
    msg.includes('permission denied') ||
    msg.includes('insufficient_privilege') ||
    msg.includes('access denied')
  );
};

async function run() {
  console.log(`🔐 SECURITY DEFINER role tests against ${URL}\n`);

  // 1) Anon must be denied on every business RPC.
  console.log('— Anonymous client (must be denied) —');
  for (const c of BUSINESS_RPCS) {
    const { error } = await anon.rpc(c.fn as never, c.args as never);
    log(!!error && isDenied(error), `anon → ${c.name}`, error?.message ?? 'unexpectedly succeeded');
  }

  if (!auth || !OWN) {
    console.log('\nℹ️  TEST_USER_JWT/TEST_BUSINESS_ID not set — skipping authenticated checks.');
    process.exit(failures > 0 ? 1 : 0);
  }

  // 2) Cross-tenant access must be denied.
  if (OTHER) {
    console.log('\n— Authenticated cross-tenant (must be denied) —');
    for (const c of BUSINESS_RPCS) {
      const args = { ...c.args, p_business_id: OTHER };
      const { error } = await auth.rpc(c.fn as never, args as never);
      log(!!error && isDenied(error), `auth/other → ${c.name}`, error?.message ?? 'unexpectedly succeeded');
    }
  } else {
    console.log('\nℹ️  TEST_OTHER_BUSINESS_ID not set — skipping cross-tenant checks.');
  }

  // 3) Own-business calls must succeed (or return empty without error).
  console.log('\n— Authenticated own-business (must succeed) —');
  for (const c of BUSINESS_RPCS) {
    const { error } = await auth.rpc(c.fn as never, c.args as never);
    log(!error, `auth/own → ${c.name}`, error?.message ?? 'ok');
  }

  console.log(`\n${failures === 0 ? '✅ All checks passed' : `❌ ${failures} check(s) failed`}`);
  process.exit(failures > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Unhandled error:', e);
  process.exit(2);
});
