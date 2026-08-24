/**
 * Regression suite for M-Pesa callback source verification.
 *
 * Both Daraja callbacks authenticate by a shared secret token carried in the
 * callback URL we register with Safaricom. A forged POST with no token (or a
 * wrong one) must be rejected before any wallet or transaction is touched.
 */
import { test, expect } from '@playwright/test';

const URL = process.env.VITE_SUPABASE_URL ?? '';
const FUNCTIONS = ['mpesa-callback', 'mpesa-b2c-callback'] as const;

const forgedStkBody = {
  Body: {
    stkCallback: {
      MerchantRequestID: 'forged',
      CheckoutRequestID: 'forged',
      ResultCode: 0,
      ResultDesc: 'The service request is processed successfully.',
      CallbackMetadata: { Item: [{ Name: 'Amount', Value: 100000 }] },
    },
  },
};

test.describe('M-Pesa callbacks reject unverified callers', () => {
  test.skip(!URL, 'Supabase env not set');

  for (const fn of FUNCTIONS) {
    test(`${fn} rejects a POST with no callback token`, async ({ request }) => {
      const res = await request.post(`${URL}/functions/v1/${fn}`, { data: forgedStkBody });
      expect(res.status()).toBe(401);
    });

    test(`${fn} rejects a POST with a wrong callback token`, async ({ request }) => {
      const res = await request.post(`${URL}/functions/v1/${fn}?token=not-the-real-token`, {
        data: forgedStkBody,
      });
      expect(res.status()).toBe(401);
    });

    test(`${fn} rejects a wrong token supplied as a header`, async ({ request }) => {
      const res = await request.post(`${URL}/functions/v1/${fn}`, {
        headers: { 'x-mpesa-callback-token': 'not-the-real-token' },
        data: forgedStkBody,
      });
      expect(res.status()).toBe(401);
    });
  }
});
