# Plan: three security fixes, publish, live keys, voice panel

## 1. Fix three findings (only these)
- **Service-delay alerts:** stop any signed-in user from running the breach check for every business. Restrict it to admins and the scheduled job; owners can only check their own business.
- **Burnout reading:** users can no longer write their own burnout score. The score is computed by the system only; users keep read access to their own.
- **Verified badge:** recheck why the owner path still works (likely an older update rule or a function that bypasses the guard), close it so only admins can set the badge, and test as a non-admin owner.
- Mark only these three fixed, then run the review again and report what remains. Other findings stay untouched until you name them.

## 2. Publish the live link
- Confirm the app builds and types check, then publish so the voice test panel, live Safaricom key form and Continue with Lovable button reach https://craft-your-journey-35.lovable.app.
- Signed in on the live link, confirm each of the three appears and opens.

## 3. Vercel site
- I cannot change Vercel settings from here. The Setup checklist already shows the two public backend settings to copy. Your steps: Vercel project -> Settings -> Environment Variables -> paste both -> Redeploy; then add the Vercel address to allowed return links (Setup step 2).
- After you redeploy, I check the Vercel site points at this backend.

## 4. Live Safaricom keys
- Needs you: open Setup -> M-Pesa, enter live consumer key, consumer secret, passkey and real Paybill number in the secure form (values never shown to me), switch to live, press Check my M-Pesa keys. Then try a KES 10 deposit on Till with your PIN; I confirm the balance updates from Safaricom's reply.

## 5. Voice test on your phone
- I verify the four-language panel renders on the live link. My test browser has no voices, so you listen on your phone and tell me which languages speak and which fall back to text; I then tune wording and pacing.

## Technical details
- Migration: revoke execute on `check_sla_breaches` from authenticated (or add admin/owner check inside); drop insert/update policies on `burnout_risk_scores` for users; inspect policies and functions touching `businesses.is_verified` and harden `guard_business_verified`.
- Use manage_security_finding for the three finding ids only.
