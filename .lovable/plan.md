# Capital voice, culture, and System Health fixes

Most of what you listed is already live on `/capital`: spoken status Q&A, the language/tone switcher (English, Kiswahili, Sheng', Kenglish), the interactive Capital journey, and the Notification Preference Center under Settings > Alerts & Language. This plan closes the real gaps: voice *commands* (not just questions), and the failing System Health jobs.

## 1. Fix the System Health failures

**security-rescan-runner — `svc.rpc(...).catch is not a function`**
The database query builders are thenable but not real Promises, so calling `.catch()` on them throws before the scan starts. Replace every `.catch(() => ...)` on a query/RPC builder with a small `safe()` helper that awaits inside `try/catch` and returns `null` on failure.

The runner also reads `pg_tables` and an `exec_sql_findings_no_rls` helper that the data API does not expose. Add one admin-only security-definer function that returns, for the public schema: table name, whether RLS is enabled, and whether an anon-readable policy exists. The runner calls that single function instead.

**gsc-submit-sitemap — failing every night (0 rows)**
Inspect the function logs and the stored run rows to get the actual Google response, then fix accordingly (most likely a scope/permission or sitemap-URL mismatch). Failure text will be surfaced in the run record instead of a bare failure badge.

After both fixes, trigger each job once from the health page and confirm a `success` row lands in the timeline.

## 2. Voice commands for Capital actions

Extend the existing voice assistant from question-answering to intent handling. Recognised phrases (in all four language registers) map to actions already available on the page:

- "confirm my details" / "thibitisha" → opens the application review step with details read aloud, then requires an explicit spoken or tapped confirmation before submit.
- "retry" → re-runs the user's own failed status refresh; admin-side disbursement retry stays admin-only.
- "what documents do I need" → speaks the required-document checklist for the current journey stage.
- "status", "repayment", "last sync" → existing spoken status answers.

Rules: no money movement or submission happens from voice alone — every state-changing intent ends in a visible confirm dialog. Unrecognised speech falls back to the AI status answer.

## 3. Polish pass

- Journey stage next-actions become tappable buttons wired to the matching page action, not text only.
- Notification Preference Center: honour the saved `frequency`/channel choice when sending webhook/cron alerts (currently alerts always fire immediately), and show the last alert sent.
- Full typecheck plus a browser pass over `/capital`, `/admin/health`, and Settings to clear any remaining runtime errors.

## Technical notes

- New DB function: `public.security_scan_table_report()`, security definer, admin-gated via `has_role`, granted to `authenticated` only.
- Edge functions touched: `security-rescan-runner`, `gsc-submit-sitemap` (fix), `capital-voice` (intent classification returns `{ intent, answer }`).
- Frontend touched: `CapitalVoiceAssistant.tsx` (intent dispatch + confirm dialog), `CapitalJourney.tsx` (action buttons), `NotificationPreferenceCenter.tsx`, `_shared/cron-alerts.ts` (respect prefs).
