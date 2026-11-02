# Plan: Publish M-Pesa & Capital work, document review, and full system test

## Where things stand
- Wallet deposits now trigger a real M-Pesa STK push, and the callback verifier checks the Safaricom confirmation token and amount before crediting the wallet. This is built but not yet live.
- The sign-in redirect fix (returns you to the page you were opening, e.g. Capital) and the four-language Capital voice guide are built but not published.
- A fresh document review of your uploads is running in the background; the earlier report was lost when the sandbox restarted.
- Credits are available again, so all of this can proceed.

## 1. Publish to the live link
- Run a full build and TypeScript check over the pending changes (sign-in redirect, voice guide, M-Pesa deposit).
- Publish so the live link matches the preview: M-Pesa deposit function, Capital redirect fix, and voice guide all live.
- Confirm the voice guide loads on the live link and the deposit endpoint answers on the live URL.

## 2. Vercel sign-in check (one step only you can do)
- I can't edit the allowed return links myself. In the app: **More → Users → Auth settings → Advanced → Redirect URLs**, add `https://craft-your-journey-ecru.vercel.app/**`, then sign in / confirm / reset on the Vercel site and tell me the result.

## 3. Real Safaricom confirmation test
- The simulated/real confirmation check already validates the callback token and amount before crediting.
- You make a small real payment to your till when prompted; I then verify your wallet balance and transaction status updated live in the database and UI.

## 4. Document review results
- Deliver the per-document verdict table: which documents are approved (current source of truth), which are superseded/duplicates, and which need your decision — with any conflicting prices or requirements called out.

## 5. Full system test and repair sweep
- Walk the whole app in a real browser: sign in, dashboard, marketing studio, inbox, customers, Capital, payments/wallet, reports, voice assistant, admin monitoring.
- Fix what is broken and keep what works, including:
  - **Marketing studio**: confirm AI content generation actually produces content on real prompts; repair anything failing.
  - **Voice assistant**: fine-tune voice selection and output quality in all four languages, improve fallbacks when a device has no voices.
  - Any buttons, features or integrations that error or do nothing.

## 6. Verification
- Build + typecheck clean, existing tests pass, targeted checks for anything repaired, then a final publish of all fixes to the live link.

## Technical notes
- Publishing covers frontend; backend functions deploy automatically on save.
- The real M-Pesa test depends on your live Daraja secrets, which are already stored.
