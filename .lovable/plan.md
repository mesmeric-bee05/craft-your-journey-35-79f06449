# Plan: serious fixes, live M-Pesa keys, Vercel, voice test, Lovable sign-in

## 1. Fix the two serious findings, then re-run the review
- **Wallet money:** stop signed-in users from creating or topping up wallet funds themselves. Only the payment confirmation and admin/system paths can add money; recheck the wallet rules and the wallet credit function.
- **Telegram messages:** re-read the Telegram sender and make sure it only sends to the chat saved on that conversation's customer, never a chat the caller picks; redeploy.
- Mark only these two findings fixed, then run a fresh deep review and report what's left (the 7 warnings stay untouched unless you ask).

## 2. Live Safaricom key form (admin only)
- Finish the "Check live keys" form in the Setup checklist: admins type consumer key, secret, passkey and Paybill; the app asks Safaricom if they work without charging, rejects practice keys (174379), limits to 10 checks an hour, and logs each check without the keys.
- When the check passes, I open a secure form in chat so you save the live keys, then switch the payment mode to live.
- Publish, then press "Check my M-Pesa keys" on the live link and report the result.

## 3. Vercel site
- I can't change the Vercel project from here. I'll add exact copy-paste steps to the Setup checklist: set the two public backend settings in Vercel to this project's values, redeploy, and add the Vercel address to the allowed return links. After you do it, I'll check the Vercel site's sign-in and data.

## 4. Voice test panel on the live link
- Put the existing four-language voice test on the Capital page (and Setup checklist): play each language, change speed, mark how it sounded, copy results.
- Publish. You walk it on your phone and send me the results; I then tune wording and pacing.

## 5. Continue with Lovable + Google
- Add a "Continue with Lovable" button and swap the grey Google logo for the official coloured one on sign-in and sign-up.
- Publish and test Google and Lovable sign-in on the live link as far as a test browser allows (the Google account step needs you).

## Needs you
- Live Safaricom keys (secure form), Vercel settings change, phone voice test, final Google account confirmation.
