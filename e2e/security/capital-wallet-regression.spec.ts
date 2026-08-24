/**
 * Regression suite for the money-movement hardening:
 *  - repayments stay admin/automation-only
 *  - wallet balances only change through the atomic ledger functions
 *  - transactions cannot be self-completed by a business owner
 *
 * Runs against the deployed backend with the anon key, and additionally with
 * TEST_USER_JWT (a normal business owner) when that secret is available.
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL ?? '';
const ANON = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const JWT = process.env.TEST_USER_JWT ?? '';

const ZERO = '00000000-0000-0000-0000-000000000000';

const anonClient = () => createClient(URL, ANON);
const userClient = () =>
  createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${JWT}` } } });

test.describe('Repayments are admin/automation-only', () => {
  test.skip(!URL || !ANON, 'Supabase env not set');

  test('anon cannot call record_capital_repayment', async () => {
    const { error } = await anonClient().rpc('record_capital_repayment' as never, {
      p_advance_id: ZERO,
      p_amount: 1,
    } as never);
    expect(error).not.toBeNull();
  });

  test('signed-in business owner cannot call record_capital_repayment', async () => {
    test.skip(!JWT, 'TEST_USER_JWT not set');
    const { error } = await userClient().rpc('record_capital_repayment' as never, {
      p_advance_id: ZERO,
      p_amount: 1,
    } as never);
    expect(error).not.toBeNull();
    expect(/admin|permission|denied|not allowed|forbidden/i.test(error!.message)).toBeTruthy();
  });

  test('owner cannot insert capital_repayments rows directly', async () => {
    test.skip(!JWT, 'TEST_USER_JWT not set');
    const { error } = await userClient()
      .from('capital_repayments')
      .insert({ advance_id: ZERO, amount: 1 } as never);
    expect(error).not.toBeNull();
  });
});

test.describe('Wallet balances stay atomic', () => {
  test.skip(!URL || !ANON, 'Supabase env not set');

  test('anon cannot read wallets', async () => {
    const { data } = await anonClient().from('wallets').select('*').limit(1);
    expect(data?.length ?? 0).toBe(0);
  });

  test('owner cannot write a wallet balance directly', async () => {
    test.skip(!JWT, 'TEST_USER_JWT not set');
    const svc = userClient();
    const { data: wallet } = await svc.from('wallets').select('id, balance').limit(1).maybeSingle();
    test.skip(!wallet, 'no wallet visible to the test user');
    const { error } = await svc
      .from('wallets')
      .update({ balance: Number(wallet!.balance) + 1000 } as never)
      .eq('id', wallet!.id);
    expect(error).not.toBeNull();
    expect(/balance|guard|not allowed|permission|denied/i.test(error!.message)).toBeTruthy();
  });

  test('wallet_credit/wallet_debit are not callable by anon', async () => {
    for (const fn of ['wallet_credit', 'wallet_debit'] as const) {
      const { error } = await anonClient().rpc(fn as never, {
        p_wallet_id: ZERO,
        p_amount: 1,
      } as never);
      expect(error).not.toBeNull();
    }
  });
});

test.describe('Transactions cannot be self-completed', () => {
  test.skip(!URL || !ANON || !JWT, 'Supabase env or TEST_USER_JWT not set');

  test('owner cannot flip a transaction to completed or change its amount', async () => {
    const svc = userClient();
    const { data: tx } = await svc
      .from('transactions')
      .select('id, amount, status')
      .neq('status', 'completed')
      .limit(1)
      .maybeSingle();
    test.skip(!tx, 'no pending transaction visible to the test user');

    const statusUpdate = await svc
      .from('transactions')
      .update({ status: 'completed' } as never)
      .eq('id', tx!.id);
    expect(statusUpdate.error).not.toBeNull();

    const amountUpdate = await svc
      .from('transactions')
      .update({ amount: Number(tx!.amount) + 500 } as never)
      .eq('id', tx!.id);
    expect(amountUpdate.error).not.toBeNull();
  });
});
