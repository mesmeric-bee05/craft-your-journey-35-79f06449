# Save, publish and check the live link

## 1. Fix what blocks saving
- The payment prompt function has 4 errors (wrong order of inputs to its "bad request" reply). Fix them so the build is clean again.
- Finish the admin verified-badge switch on the Setup checklist and confirm a non-admin is refused.

## 2. Publish and check signed in on the live link
- Publish https://craft-your-journey-35.lovable.app.
- Signed in, check: sign-in (email + Continue with Google), dashboard, fonts, search, Marketing, Till, Capital voice guide (all four languages selectable), verified-badge switch.
- Fix anything that breaks, republish.

## 3. Your KES 20 deposit
- Look up that deposit in Till history and report its real status (paid, pending or failed) from Safaricom's reply. The current keys are Safaricom's practice Paybill, so no real money moves until live keys are added.

## 4. Live M-Pesa (waits on you)
- When you send live keys, a secure form collects: consumer key, consumer secret, passkey, your real Paybill number, and live mode. Then "Check my M-Pesa keys" confirms them and a KES 10 deposit is tested with your PIN.

## 5. Voice guide wording
- Tidy wording and pauses in all four languages. Listening on your phone stays with you; I'll refine from what you report.

## 6. Security scan
- Run a fresh scan and report results. Only findings you name get fixed.

## Note on your two sites
Your note says the Vercel site keeps its own backend with a Gemini key. I'll leave Vercel as is and keep the Lovable link on this project's backend. Changes here won't reach the Vercel backend automatically.

## Technical
- `supabase/functions/mpesa-stk-push/index.ts` lines 169-198: match the `badRequest` signature in the shared helper.
- Typecheck plus edge function check before publish; Playwright signed-in sweep against the live URL.
