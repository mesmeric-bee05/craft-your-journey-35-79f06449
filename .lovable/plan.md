# Capital voice sync summary, admin page fixes, exports, and remaining-work audit

## 1. Spoken sync summary in the Capital voice assistant

Add a "sync" intent so an owner can ask "when did it last sync?", "webhook", "last update", "imesasishwa lini?" and hear one spoken answer covering:

- last partner webhook event received (type, status, time)
- last repayment cron run (status, time, rows recorded)
- last disbursement callback and current advance balance

The `get_my_advance_status` RPC is extended to also return the owner's last webhook event timestamp/status and the last repayment-cron run summary, so no new client queries or admin data leak in. The voice edge function gets a `sync_status` intent branch that phrases these in the owner's chosen language and tone (English, Kiswahili, Sheng', Kenglish). A tappable "Last sync" quick-question chip is added next to the existing chips.

## 2. System Health and SEO Monitor navigation

Both pages currently do their own inline `has_role` lookup and silently `Navigate` to `/dashboard`, which is why the tabs feel like they "do nothing" for non-admins.

- Replace the inline checks with the shared `useIsAdmin` hook so the state is cached and consistent with the sidebar gating.
- While the role resolves, render a loading skeleton instead of `null` (blank flash).
- For a signed-in non-admin, render a clear "Admin access required" card with a link back to the dashboard instead of a silent redirect.
- Keep the timeline and findings panels on both pages, but scope `CronRunsTimeline` on `/admin/seo` to SEO jobs only (it currently shows the same unfiltered list on three pages, which is why Health, SEO Monitor and Capital Ops all look identical).

## 3. Fix the remaining System Health failures

- `security-rescan-runner` still shows the old `svc.rpc(...).catch is not a function` error because it has not had a successful run since the fix. Verify the deployed code, trigger one run, and confirm a `success` row lands.
- `gsc-submit-sitemap`: keep the `skipped` status, but surface it on the health tile as a neutral "setup needed" state (amber, not a red failure badge) with the verification instruction shown as guidance, and exclude `skipped` from failure alerting.
- SEO findings show `canonical_missing` and `jsonld_missing` on `/`, `/auth`, `/reset-password`, and the resources page. These tags are injected client-side, so the crawler never sees them. Fix by adding static canonical link tags and the baseline organisation JSON-LD into `index.html`, and have per-route components override rather than being the only source. Then re-run the audit and confirm those findings clear.

## 4. Per-application Capital timeline and audit export

Add an export control (CSV and PDF, using the existing `src/lib/opsExport.ts` helpers) that downloads one application's full history:

- application and advance details header (business, amount, revenue share, status)
- the audit log entries (action, actor, timestamp, metadata)
- disbursement attempts and repayment records
- webhook events tied to that application

Placement: an "Export" split button on the per-application audit timeline (used on `/admin/capital` detail and `/admin/capital/audit`) and on the user-facing `/capital` status card so an owner can download their own record. Filenames include the application id and date.

## 5. Remaining Work checklist

`.lovable/plan.md` holds only the current plan; the previous plans are archived under `.lovable/plan/`. The checklist will compare those three archived plans (Capital ops hardening, Track B voice/culture, voice + System Health fixes) against the repo and be written to `/mnt/documents/remaining-work.md` plus rendered as a short summary in chat, marking each item done / partial / missing with the file that implements it.

## Technical notes

- DB: extend `public.get_my_advance_status` (security definer, owner-scoped) with `last_webhook_event`, `last_repayment_cron`, and `last_disbursement_event` fields.
- Edge function: `capital-voice` gains `sync_status` intent detection and a matching system-prompt branch; `cron-alerts` ignores `skipped`.
- Frontend: `CapitalVoiceAssistant.tsx`, `AdminHealth.tsx`, `AdminSEO.tsx`, `CronRunsTimeline.tsx` (job filter prop), `CapitalAuditTimeline.tsx` (export), `src/lib/opsExport.ts` (application export columns), `index.html` (static canonical + JSON-LD).
- Verification: typecheck, trigger each cron job once from `/admin/health`, re-run the SEO audit, and a browser pass over `/capital`, `/admin/health`, `/admin/seo` as both admin and non-admin.
