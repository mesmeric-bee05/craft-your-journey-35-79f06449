# Capital voice sync, remaining-work checklist, security verification & regression tests

## 1. Capital voice: sync summary command
The voice assistant already recognises a "sync status" intent. Finish it so the spoken answer is reliable:
- Add explicit quick-question chips in the Capital voice assistant: "When did my advance last sync?" / "Ilisasishwa lini?" in the active language.
- Make sure the advance status data feeding the answer always carries the last partner webhook event, the last nightly repayment job run, and the last disbursement event with their timestamps and success/failure, so the spoken reply names both the most recent success and the most recent failure with relative times.

## 2. In-app "Remaining Work" checklist
There is no current `.lovable/plan.md` — only archived approved plans under `.lovable/plan/`. The checklist will therefore be built from a checked-in manifest instead of parsing plan files at runtime:
- Add a typed feature manifest (id, title, area, plan source, expected artefacts, status) derived from the archived plans.
- Add an admin-only "Remaining work" section in the monitoring shell that renders the manifest as grouped, actionable tasks with status badges (done / partial / missing) and a link to the relevant page.
- Keep it read-only and static — no runtime repo scanning from the browser.

## 3. Security re-scan & verification
- Run a fresh scan and confirm the nine previously fixed findings (the five capital/wallet/SEO ones and the four M-Pesa/wallet/transaction ones) no longer appear as open.
- Report any newly surfaced findings back rather than silently fixing unrelated ones.

## 4. Audit log for the fixed findings
- Record one audit entry per fixed internal_id (actor, finding id, what changed, commit context) in the existing security audit event trail so the Security audit tab shows who triggered each fix.

## 5. Notifications on scan completion and status change
- In-app: keep the existing admin notification rows, and surface them in the notification centre (not only the monitoring tab) so a completed scan or a finding status change is visible app-wide.
- Email: send a digest email to admin users via the existing email function when a scan completes or a finding changes status, linking to the Security audit and findings pages. Guard against duplicate sends per scan run.

## 6. Automated regression tests
Add a Vitest setup (currently missing) plus targeted tests:
- Repayments stay admin/automation-only: calling the repayment routine as a normal business owner is rejected.
- Wallet balances only move through the atomic credit/debit routines; a direct balance update is blocked by the guard trigger.
- Transactions cannot be self-completed: an owner cannot change amount, currency or status.
- M-Pesa callbacks stay protected: forged POSTs without the callback token return 401 for both callbacks; a request with the token is accepted.
Wire these into the existing security CI workflow so a failure blocks merges.

## 7. Monitoring tabs verification
- Verify System health, SEO monitor and Security audit tabs render correct statuses and last-scanned timestamps, and that a non-admin sees a clear permission-denied state instead of a broken tab or blank panel.
- Fix any build, type or runtime errors surfaced along the way.

## Technical notes
- Files touched: `src/components/capital/CapitalVoiceAssistant.tsx`, `supabase/functions/capital-voice/index.ts`, new remaining-work manifest + panel under `src/components/admin/`, `src/pages/admin/AdminMonitoring.tsx`, `src/components/notifications/`, new `vitest.config.ts` + `src/test/` and tests, `.github/workflows/security-checks.yml`.
- Backend: a migration only if the sync-summary RPC or notification triggers need extra fields; no schema changes otherwise.
- Emails go through the existing Resend-backed email function; recipients are users holding the admin role.
