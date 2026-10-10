# Fix sign-in, finish the voice walkthrough, publish and verify

## 1. Fix sign-in (the two errors in your screenshots)
- **"Unsupported provider: missing OAuth secret"** — the Google button talks to the sign-in service directly, but Google was never set up there. Switch on the built-in Google sign-in and change the button to use it. It works on the Lovable link (craft-your-journey-35.lovable.app) and on custom domains.
- **The Vercel copy (craft-your-journey-ecru.vercel.app)**: built-in Google sign-in can't work on a site hosted outside Lovable. On that site the Google button will show a clear message pointing to the main link. Email sign-in keeps working there once the Vercel address is added to the list of allowed return links.
- **"Invalid email or password"** — your account exists, but the password didn't match. Make the sign-in screen offer "Reset password" right after a failure. The reset email returns you to whichever site you used.
- Test email sign-in, a failed sign-in, and Google sign-in on the live link.

## 2. Spoken application walkthrough (Capital page)
- Keep the 5 steps. Add a **Voice on/off** toggle (off = text only), a **Restart** button, and a progress bar.
- Each step shows its text. If your phone has no voice for that language, it shows "This language plays as text on this device" instead of staying silent. That answers which languages speak and which fall back to text, on your own phone.
- English and Kenglish use an English (Kenya) voice; Kiswahili and Sheng' use a Kiswahili (Kenya) voice, then any Kiswahili voice, then English.
- The repayment summary keeps using real figures and keeps refreshing every 30 seconds.

## 3. Payments: live wallet updates
- The wallet balance and transaction list update instantly when a payment confirmation arrives, without reloading.
- I can't send real money. After you pay, I'll check the transaction, the wallet credit and the logs.

## 4. Publish and verify
- Publish, then on the live link check that the Capital voice guide loads and sign-in works.
- Send the test security digest again and check the delivery result. Only you can confirm it reached your inbox.
- Re-run the security check.

## 5. Things only you can do (I will list them clearly at the end)
- Listen to the guide on your phone in the four languages; the page will mark which ones fall back to text.
- Make a small real till payment.
- Connect ChatGPT using the Quick start box, then ask "List my customers" and "Add customer Jane, 0712…". I'll then check the server logs and confirm it only reached your business.

## Uploaded documents
I'll go through the Source-of-Truth Baseline, the Operating Model report and the Feature Prompts. Anything that conflicts with what's built (pricing, scope gates such as lending and mental-health safety) will be listed for you to decide on, not changed silently.

## Technical details
- `supabase--configure_social_auth(["google"])`; replace `supabase.auth.signInWithOAuth` in useAuth with `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`, keep the `next` path in sessionStorage and navigate to it after the session arrives; detect hosts other than *.lovable.app and custom domains (e.g. vercel.app) and show the fallback message.
- Add the Vercel origin to the auth redirect allow-list via configure_auth.
- CapitalVoiceGuide: `voiceOn` state saved in localStorage, restart, `speechSynthesis.getVoices()` + `voiceschanged` to find the voice for each language, text-fallback badge.
- useWallet/useTransactions: Realtime subscription on wallets/transactions, filtered by business_id; enable realtime publication for those tables (RLS still applies).
