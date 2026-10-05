# Storage rule fix, digest check, assistant test, connect page, voice layer

## 1. Fix the file storage rule (critical finding)
- The flagged rule is "Block anonymous access to private buckets". It ends in `AND false`, so it never actually lets anyone in. But the scanner reads it as an open download rule. Private files are already blocked by default, so the rule does nothing useful.
- Remove that rule. Business files stay readable only by owners and team members, through the existing per-business rules.
- Also remove the rule that lets anyone *list* everyone's profile photos (info finding). Photos still show through their public links; only browsing the full list stops.
- Re-run the storage access tests: signed-out users can't list or download business files, members can reach their own business folder, and other businesses' folders are refused.
- Re-scan, confirm both findings are gone, and mark them fixed.

## 2. Security scan + digest email
- Run a scan from the scanner job (job secret), then read the digest result: sent count, failures, and any Resend error.
- If Resend rejects the sender (domain not verified), report the exact error and the fix (verify the domain in Resend, or switch to a verified sender).
- You confirm the email arrived; I can't see your inbox.

## 3. Assistant sign-in test (list + add customer, own business only)
- Publish first.
- I can't sign in to your Claude or ChatGPT account. Instead I sign in to the live connection the same way an assistant does: register a test assistant, sign in as your SmartReach user, approve on the consent page in a browser, then use the token it gets.
- With that token: list customers, add a test customer, add it again (expect the same customer back), and confirm every returned customer belongs to your business only (checked against the database).
- Remove the test customer afterwards.
- Testing needs one SmartReach account to sign in as; if there are several, I'll ask which.

## 4. Connect your AI assistant page
- The page already shows the live connection link with a copy button, plus Claude, ChatGPT, Claude Code and other steps.
- Add a short "Quick start" box at the top: copy the link, then the 3 key steps each for ChatGPT and Claude, and a "Test your connection" line ("Ask: list my customers").
- Check the page on a phone-sized screen.

## 5. Voice commerce layer (all four languages)
- Already built: spoken status, sync and repayment summaries; voice confirm steps; language and tone switcher.
- Add a guided spoken walkthrough of the application steps (amount, documents, confirm, submit). Each step is read aloud in the chosen language, with Next and Repeat buttons. Nothing is submitted without an on-screen tap.
- Add fixed, translated repayment-summary phrasing for English, Kiswahili, Sheng' and Kenglish, so the spoken summary works even when AI is unavailable. Amounts and dates come from your data only.
- Browser read-aloud uses the right voice for each language (sw-KE, en-KE), falling back to the closest available voice.
- Test: each language plays the summary and the steps, and switching language keeps your place.

## 6. Records
- Update roadmap.md; record the storage-rule decision in AGENTS.md.

## Needs you
- Confirm the digest email arrived.
- If there are several SmartReach accounts, tell me which one to test as.
