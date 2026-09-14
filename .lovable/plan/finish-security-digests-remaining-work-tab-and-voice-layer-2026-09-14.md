# Finish security digests, Remaining Work tab, and voice layer

## 1. Security digest emails
- Save the Resend key securely (you enter it in a secure form) plus a sender address like `SmartReach Security <security@yourdomain>`. Until a domain is verified in Resend, digests only reach the account owner's own address.
- After each security scan finishes and after any finding status change, the app sends the digest automatically instead of waiting for a manual trigger.
- Run a scan, confirm the digest was sent, and report what landed (or the exact reason it did not).

## 2. Remaining Work tab
- Add the visible "Remaining Work" button to the monitoring tab bar so the panel is reachable in admin (panel and route already exist).
- Each item keeps its status (done / partly done / not started), area filter, search, and an "Open" link to the page where the work happens.
- Refresh the checklist against the approved plans so every plan item shows a current status.

## 3. Notification bell
- Scan-completed and finding-status-changed alerts appear in the bell for admins, with a plain-language version for business owners on failed scans or new critical findings, each deep-linking to the security pages.

## 4. Voice commerce layer
- Voice-assisted application steps: ask to review or confirm application details by voice, with on-screen confirmation before anything is submitted.
- Language switch across English, Kiswahili, Sheng', and Kenglish that keeps data and actions intact, in both the text and spoken replies.
- Spoken repayment summary: outstanding balance, next collection, last successful or failed repayment with timestamps — in the same voice as the Capital assistant.

## 5. Verification
- Full build and TypeScript check; fix anything that fails.
- Confirm the monitoring tabs show correct scan status and last-scanned times for both admins and regular users.

## Technical notes
- Secrets: `RESEND_API_KEY`, `SECURITY_ALERT_FROM` via the secure secret form.
- `security-rescan-runner` calls `security-notify-email` with the job secret after upserting findings; the finding-status-change trigger enqueues rows in `security_admin_notifications` and the digest function stamps `emailed_at` so nothing is sent twice.
- `AdminMonitoring.tsx`: add the missing `TabsTrigger value="work"` with a `ListChecks` icon (import already present).
- Voice work extends `supabase/functions/capital-voice/index.ts` (intents `confirm_details`, `repayment_summary`, `sync_status`) and `CapitalVoiceAssistant.tsx` / `CultureProvider`; no schema changes needed — data comes from `get_my_advance_status`.
