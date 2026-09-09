# Security alerts, notification bell and Remaining Work panel

## 1. Email on every scan and status change

Wire the existing security email digest so it fires automatically:

- After the periodic security re-scan finishes (success or failure), it calls the digest function with the job secret so admins get a mail summarising the scan.
- When a finding changes status (opened, fixed, ignored), the same digest is triggered, so a mail follows each change.
- Delivery stays once-only: rows already marked as emailed are skipped, so a retry never double-sends.
- If mail is not configured, the app still records the alert in-app and reports "email not configured" instead of failing the scan.

## 2. Sender settings

Email needs a key and a sender address before digests can leave the app. I will request the Resend key and set the "from" address as a stored setting. Note: mail sent from the shared test sender only reaches the account owner's own address — to mail every admin, the sender domain must be verified with Resend.

## 3. Notification bell

Security events currently live only in the admin security tab. I will also write them to the normal notification stream so they appear in the bell:

- Admins get every scan completion and finding status change, linking to the security audit tab.
- Regular users get only high-severity, business-relevant alerts, linking to a page they can open — no admin-only links.
- Existing unread counts, grouping and the optional sound keep working unchanged.

## 4. Remaining Work checklist

Add a fourth tab, "Remaining work", to the admin monitoring page, built from the existing manifest:

- Summary counts: done, partly done, still missing.
- Grouped by area (Capital, Security, Monitoring, SEO, SACCO, Platform, Voice & Culture) with a filter and search box.
- Each item shows its status, what still needs doing, the plan it came from, and a link that jumps straight to the relevant page.
- Items still open are shown as actionable tasks at the top.

## 5. Build and typecheck

Run a full build plus TypeScript check over everything above and fix any failures, including the earlier untested security changes.

## Technical notes

- `security-rescan-runner` invokes `security-notify-email` with `x-job-secret`; a DB trigger on `security_findings` status changes enqueues a notification and the digest picks it up on its next run (plus an immediate call from the scan runner).
- Bell rows go into `public.notifications`; `notification_type` gains a `security_alert` value via migration, with `useNotifications` and `NotificationItem` handling the new kind and icon.
- New component `src/components/admin/RemainingWorkPanel.tsx` consuming `REMAINING_WORK` / `workSummary` from `src/lib/remainingWork.ts`; tab key `work` added to `AdminMonitoring.tsx` route params and metadata.
- `security-notify-email` and `security-rescan-runner` redeployed after edits.
- Manifest entries for the email digest and remaining-work panel flip to `done` once shipped.
