# Next round: secure, fix and polish

## 1. Fix the two critical security issues (you asked for these in your report)
- **Telegram messages**: the app will only send to the Telegram chat already linked to one of your business's conversations. The screen sends the conversation, not a chat number; the server checks you belong to that business and records each send.
- **M-Pesa charge amount**: the server decides and checks the amount (allowed range, linked invoice/order or wallet top-up limits), never trusting the number typed in the browser. Mismatches are refused and logged.
- Mark both findings fixed, then run a fresh full security scan.

## 2. Full system sweep and repairs
- Sign in as the test account and walk every page: click main buttons, forms and dialogs; fix anything broken (errors, empty screens, dead buttons).
- Check build and code checks are clean; fix any errors.
- Marketing studio: generate, save, show in history.
- Till page: deposit dialog, live balance, history.

## 3. Culturally tuned voice
- Refine wording of the Capital voice guide and repayment summary in English, Kiswahili, Sheng' and Kenglish (natural phrasing, KES amounts read clearly, short sentences).
- Keep best-voice selection and clear "plays as text" fallback.

## 4. Publish and confirm live
- Publish, then check the live link loads, sign-in works, and fonts, search, marketing and Till work there.

## Still needs you (cannot be done by me)
- Vercel site: point it at this project's backend (recommended) and add its address to allowed return links.
- Enter your M-Pesa PIN for a real small payment test.
- Connect ChatGPT via the Quick start box.
- Listen to the voice guide on your phone.
- Choose one financing model.

## Technical notes
- Telegram send function: accept `conversation_id` + text; resolve `chat_id` server-side from conversations/channel rows scoped to caller's business; audit log row.
- STK/charge function: validate amount server-side (bounds, source record ownership), reject client `amount` overrides; keep phone binding to profiles.phone.
