# Fix sign-in, publish payment + voice updates, verify the live link

## 1. Fix "Continue with Google" (confirmed cause)
The Google button calls the backend's own Google sign-in directly, which has no Google secret, so it shows "Unsupported provider: missing OAuth secret". Switch it to the managed Google sign-in (no keys needed), turn the managed Google provider on, and keep the "return to the page you wanted" behaviour. Add "Continue with Lovable" next to it, same size.

## 2. Email sign-in / sign-up
"Invalid email or password" for alvo4breezy@gmail.com: check that the account exists and is confirmed, and that email sign-in is enabled. If the password is simply wrong, the existing "Reset your password" link is the fix (I can't see or set your password). Test sign-up, sign-in, reset and sign-out end to end.

## 3. Verified badge (admin only)
The database already blocks non-admins. Add an admin "Verify business" switch in the admin area, then test: admin can verify a business, a regular user's attempt is refused.

## 4. M-Pesa live path
The key check is built. Real money needs Safaricom live keys (yours are test keys, practice Paybill 174379). When you have them, I open a secure form for: live consumer key, live consumer secret, live passkey, your Paybill number, and switch to live mode. Then you press Deposit KES 10 on Till and enter your PIN; I confirm balance and transaction status from the Safaricom confirmation.

## 5. Full sweep
Signed-in check, phone and desktop, light and dark: landing, sign-in, dashboard and every sidebar page and tab, plus search, Marketing generation, Till, Capital voice guide, Connect your AI assistant. Fix every error found.

## 6. Security scan and publish
Quick + deep security scan, fix critical issues, publish, then confirm on the live link: fonts, search, Marketing, Till, voice guide, Google sign-in.

## Needs you (can't be done from here)
- Live Safaricom keys from Daraja "Go Live", and entering your PIN.
- Connecting ChatGPT (signing into your ChatGPT account).
- Listening to the voice guide on your phone; I'll refine wording/pacing from what you report.

## Technical details
- `useAuth.signInWithGoogle`: replace `supabase.auth.signInWithOAuth` with `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`, keep `post_auth_next` in sessionStorage; call configure_social_auth for google + lovable; upgrade `@lovable.dev/cloud-auth-js` to ^1.3.0 for LovableMark.
- Badge: admin toggle updates `businesses.is_verified`; existing `guard_business_verified` trigger enforces admin-only; Playwright check as non-admin test user.
- M-Pesa: set MPESA_ENV=production via secrets after live keys arrive; verify with mpesa-status.
