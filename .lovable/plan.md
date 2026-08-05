# Track B: Voice, Culture & Capital Experience

Track A (Capital ops hardening) is done. This plan delivers the voice assistant, the culturally tuned language layer, the applicant onboarding journey, a notification preference center — and fixes the two broken admin tabs.

## Verified current state

- `/admin/health` and `/admin/seo` routes and sidebar links both exist and render correctly. They fail because **no user in this project has the `admin` role** — `user_roles` contains only two `business_owner` rows, so `has_role(uid,'admin')` returns false and both pages immediately redirect to `/dashboard`. This is a data/access issue, not a routing bug. Both links are also shown to every user, which is why they look broken rather than hidden.
- No voice/speech code exists anywhere in `src/`. No localization layer either — no i18n library, no language/register preference; Swahili/Sheng' appears only as ad-hoc prompt text in AI edge functions.
- `user_settings` already holds notification toggles (email/push/sms, per-event flags) but has no channel routing (Slack), no frequency control, and no ops/webhook/cron categories.
- Capital user page currently shows the status timeline, disbursement progress, repayment ledger and last-synced line added in Track A — all English, text-only.

## 1. Fix the admin tabs

- Grant the `admin` role to the project owner account so `/admin/health` and `/admin/seo` load.
- Hide the "System Health" and "SEO Monitor" sidebar links for non-admins (single admin check in the layout), so non-admins never click into a redirect.
- Replace the silent `Navigate` on both pages with an explicit "Admin access required" state while the role check resolves, so a slow check no longer looks like a dead tab.

## 2. Cultural language layer (`src/lib/culture/`)

- Locale + register model: `en` (professional), `sw` (professional Swahili), `sheng` (casual Nairobi Sheng'), `kenglish` (code-switch). Register axis: formal vs casual.
- A lightweight typed dictionary (no heavy i18n dependency) covering Capital status, disbursement, repayment, onboarding and notification strings, plus KES/date formatting helpers.
- `CultureProvider` + `useCulture()` with the preference persisted to `user_settings.preferences.culture` and a language/tone switcher in the Capital header and Settings.
- A shared system-prompt builder so the voice assistant, content generation, reply suggestions and Biashara Mind all speak in the same selected register.

## 3. Voice-assisted Capital status assistant

- `VoiceAssistant` panel on `/capital`: hold-to-talk mic, live transcript, spoken reply, and a text fallback input.
- Speech in via Lovable AI transcription (audio uploaded to a `capital-voice` edge function — key stays server-side), speech out via Lovable AI text-to-speech streamed back and played progressively.
- The function answers only from the caller's own advance via the existing owner-scoped RPC: disbursement progress and M-Pesa reference, repayment activity and balance, last webhook/cron sync, and next required action. Replies are generated in the selected language/register.
- Voice command intents: confirm application details, retry a failed disbursement, list required documents, read repayment schedule. Every write/retry intent renders a confirmation card that must be tapped — voice never mutates data on its own.

## 4. Interactive Capital onboarding

- Staged guided flow (eligibility → score explainer → offer terms → documents → e-sign → submitted → disbursement → repayment) rendered in the chosen cultural voice, with one clear next action per stage and optional spoken narration of each step.
- Progress is derived from existing application/advance state, so a returning applicant resumes at the right stage.

## 5. Notification preference center

- New Settings tab: per-category (webhook failures, cron/sync updates, disbursement, repayment) channel choice (email / Slack / in-app) and frequency (immediate / hourly digest / daily digest / off).
- Stored on `user_settings` (new columns + grants, RLS unchanged: owner-only), consumed by the existing `notifyOpsFailure` path so admin alerts respect per-user routing and digests instead of always firing Slack.

## Technical notes

- Migration: `admin` role grant, `user_settings` notification-preference columns with explicit `GRANT`s, and a digest queue table for hourly/daily batching (owner-scoped RLS).
- New edge functions: `capital-voice` (transcribe → intent → owner-scoped answer → TTS) and `notification-digest` (cron-driven digest flush), both validating input with Zod and reusing `_shared/auth.ts`.
- No new privileged data path: the assistant reads through `get_my_advance_status` and existing RLS-scoped queries only.
- Typecheck and build after each section.
