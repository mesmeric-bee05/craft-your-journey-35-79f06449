/**
 * Smoke RLS coverage: confirm the most sensitive tables deny anonymous access.
 * Extend TABLES_TO_TEST as new tables are added.
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL ?? '';
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

const TABLES_TO_TEST = [
  'businesses',
  'business_members',
  'customers',
  'conversations',
  'messages',
  'notifications',
  'transactions',
  'wallets',
  'bundles',
  'bundle_items',
  'bundle_suggestions',
  'business_health_score',
  'business_health_score_history',
  'security_findings',
  'security_check_runs',
  'audit_logs',
  'feedback_submissions',
  'feedback_moderation_rules',
  'business_public_profiles',
] as const;

test.describe('RLS — anon denied', () => {
  test.skip(!URL || !ANON, 'Supabase env not set');
  const anon = createClient(URL, ANON);

  for (const table of TABLES_TO_TEST) {
    test(`anon cannot read ${table}`, async () => {
      const { data, error } = await anon.from(table).select('*').limit(1);
      // Either denied OR returns empty (RLS effectively hides rows).
      expect(data?.length ?? 0).toBe(0);
      if (error) {
        expect(error.code === '42501' || /permission|denied/i.test(error.message)).toBeTruthy();
      }
    });
  }
});

test.describe('Storage — anon access', () => {
  test.skip(!URL || !ANON, 'Supabase env not set');
  const anon = createClient(URL, ANON);

  test('anon cannot list business-assets root', async () => {
    const { data } = await anon.storage.from('business-assets').list('');
    expect(data?.length ?? 0).toBe(0);
  });

  test('anon cannot list avatars root', async () => {
    const { data } = await anon.storage.from('avatars').list('');
    expect(data?.length ?? 0).toBe(0);
  });
});

test.describe('Public RPCs — anon allowed (no PII)', () => {
  test.skip(!URL || !ANON, 'Supabase env not set');
  const anon = createClient(URL, ANON);

  test('is_business_slug_available is callable by anon', async () => {
    const { error } = await anon.rpc('is_business_slug_available' as never, { p_slug: 'x' } as never);
    expect(error).toBeNull();
  });

  test('get_public_business_profile returns null for unknown slug, no error', async () => {
    const { error } = await anon.rpc('get_public_business_profile' as never, { p_slug: '__none__' } as never);
    expect(error).toBeNull();
  });
});

test.describe('Privileged RPCs — anon denied', () => {
  test.skip(!URL || !ANON, 'Supabase env not set');
  const anon = createClient(URL, ANON);

  for (const fn of ['get_csat_metrics', 'get_sla_metrics', 'get_safe_channels', 'get_channel_tokens', 'get_stream_credentials'] as const) {
    test(`anon cannot call ${fn}`, async () => {
      const { error } = await anon.rpc(fn as never, { p_business_id: '00000000-0000-0000-0000-000000000000' } as never);
      expect(error).not.toBeNull();
    });
  }
});
