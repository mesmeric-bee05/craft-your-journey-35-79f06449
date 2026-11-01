# Fix the Capital redirect, wire M-Pesa receiver, verify digest + scan, review docs, publish

## 1. Fix the Capital → Dashboard redirect (root cause found)

When you open `/capital` while not signed in (or with an expired preview session), the app bounces you to `/auth`, but after sign-in it always sends you to `/dashboard` — the intended page is thrown away. Confirmed in code:

- `src/components/auth/RequireAuth.tsx` redirects to `/auth` and stores the original page in route state, but nothing reads it.
- `src/pages/Auth.tsx` only reads a `?next=` query parameter and defaults to `/dashboard`.

Fix:
- `RequireAuth` will append the blocked path as a `?next=` parameter when redirecting to `/auth`.
- `Auth.tsx` will honor the route state (`location.state.from`) as well as the `?next=` param, reusing the existing `safeNextPath` guard.

Verify: mint a preview session, open `/capital` in a browser, confirm the page loads with the voice guide visible in all four language tabs (English, Kiswahili, Sheng, Kenglish). Audio playback still depends on your device — I'll confirm the language switching and voice engine selection on screen and report which languages have an available voice versus falling back to text.

## 2. Review your uploaded documents

Read the uploaded documents in Files (Master Document versions, the security thesis, financials, operating-model/risk report, build prompts) with a focused pass:
- Extract anything that changes product decisions (pricing, features, roadmap) and report differences from what's built.
- Do not make sweeping changes from them in this pass — report findings first so you can decide what to build next.

## 3. Wire and verify the M-Pesa payment receiver

All receiver credentials are already stored (consumer key/secret, shortcode, passkey, callback token, B2C credentials). Work:
- Verify `payment-receiver` (and the STK/callback functions) use these stored credentials and the shared callback-token check, end to end.
- Simulate a properly signed Safaricom confirmation (C2B confirmation with the callback token) against the receiver endpoint and confirm the wallet balance and transaction status update live on screen.
- A real till payment still needs you — after you make one, I'll verify the balance and transaction status update.

## 4. Re-run the test digest and the security check

- Trigger a fresh security scan, confirm the digest email actually sends (check the mail send logs and report the delivery status).
- Review findings shown after the scan and report their statuses.

## 5. Google sign-in on the Vercel site

- Confirm the sign-in code uses the managed Google broker with your site's own address as the return link (already updated last round).
- The one thing only you can do: open **More → Users → Auth settings → Advanced** and add `https://craft-your-journey-ecru.vercel.app/**` to the Redirect URLs (and set the Site URL if you want the Vercel site to be the default landing spot). Without it, Google sign-in there fails with "Unsupported provider".
- After you add it, I'll open the Vercel site in a browser and confirm the Google button starts the flow and the email/password form works. Confirming your actual password matches needs your own sign-in.

## 6. Publish and confirm on the live link

- Publish the app so the Capital voice guide, redirect fix, and search fixes go live.
- Open the published Capital page and confirm the voice guide loads with all four languages.
- Confirm the MCP endpoint on the live link still answers and rejects unauthenticated calls, so your ChatGPT quick-start steps work.
- ChatGPT connection (Quick start box → "List my customers") and the real till payment remain yours to trigger; I'll verify both stay inside your business and update your wallet live once you do.

## Order of work

Redirect fix → document review → M-Pesa receiver verification → digest + scan → Vercel sign-in check → publish → live-link confirmation.
