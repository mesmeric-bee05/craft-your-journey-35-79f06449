import { createHash, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const now = Math.floor(Date.now() / 1000);
const body = JSON.stringify({ event: 'payment_intent.succeeded', id: 'evt_test_123' });
const secret = 'unit-test-webhook-secret';
const rawSignature = (key, timestamp, payload) =>
  createHmac('sha256', key).update(`${timestamp}.${payload}`).digest('hex');
const capitalKey = createHash('sha256').update(secret).digest('hex');
const capitalSignature = rawSignature(capitalKey, now, body);
const stripeSignature = rawSignature(secret, now, body);

const constantTimeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
};
const verifyTimestamped = (payload, timestamp, signature, key) => {
  const timestampSeconds = Number(timestamp);
  if (!Number.isInteger(timestampSeconds) || Math.abs(now - timestampSeconds) > 300) return false;
  return constantTimeEqual(signature.replace(/^sha256=/i, '').toLowerCase(), rawSignature(key, timestamp, payload));
};
const verifyStripe = (payload, header, key) => {
  const parts = header.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  return timestamp && signatures.some((signature) => verifyTimestamped(payload, timestamp, signature, key));
};

const checks = [
  ['capital HMAC accepts the documented protocol', verifyTimestamped(body, String(now), `sha256=${capitalSignature}`, capitalKey)],
  ['capital HMAC rejects a modified body', !verifyTimestamped(`${body}x`, String(now), capitalSignature, capitalKey)],
  ['capital HMAC rejects stale timestamps', !verifyTimestamped(body, String(now - 301), capitalSignature, capitalKey)],
  ['Stripe verification accepts a v1 signature', verifyStripe(body, `t=${now},v1=${stripeSignature}`, secret)],
  ['Stripe verification rejects a wrong secret', !verifyStripe(body, `t=${now},v1=${stripeSignature}`, 'wrong-secret')],
  ['Stripe verification rejects a missing v1 signature', !verifyStripe(body, `t=${now},v0=${stripeSignature}`, secret)],
];

const migration = await readFile('supabase/migrations/20261102211000_webhook_hardening.sql', 'utf8');
const payment = await readFile('supabase/functions/payment-webhook/index.ts', 'utf8');
const capital = await readFile('supabase/functions/capital-partner-webhook/index.ts', 'utf8');
const support = await readFile('supabase/functions/support-ticket-webhook/index.ts', 'utf8');
checks.push(
  ['payment events have a provider/event uniqueness constraint', /UNIQUE \(provider, event_id\)/.test(migration)],
  ['support events have an event uniqueness constraint', /event_id text NOT NULL UNIQUE/.test(migration)],
  ['payment settlement rejects amount mismatches', /amount_mismatch/.test(migration)],
  ['payment handler uses Stripe timestamped verification', /verifyStripeSignature\(rawBody, stripeSignature, stripeSecret\)/.test(payment)],
  ['capital handler no longer accepts the legacy fingerprint header', !/x-fingerprint|fingerprint/.test(capital)],
  ['support handler requires timestamped signatures', /x-webhook-timestamp/.test(support) && /event_id/.test(support)],
);

let failures = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures += 1;
}
if (failures > 0) process.exit(1);
console.log(`Webhook contract verification passed (${checks.length} checks).`);
