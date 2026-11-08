# Restore the blank live app and verify the unfinished flows

## Confirmed status
- The live app loads its HTML and JavaScript files but crashes before React starts with `supabaseUrl is required`; the app root remains blank.
- The preview renders correctly. Its managed backend settings are available to the preview process, but there is no local `.env` file. Do not hardcode or expose backend keys.
- Till, Marketing, Connect your AI assistant, and Capital pages already exist. This work will repair and verify them, not replace them or expand unrelated features.

## Work
1. Trace how managed backend settings reach the production build; restore the supported configuration path and add a clear startup error state if required public settings are missing, rather than a blank screen.
2. Run the project’s build, type checks, existing focused tests, and verify the preview starts without startup errors.
3. Check security scan freshness and critical findings before publishing; resolve only what blocks safe publication and report any unresolved findings.
4. Publish the repaired app, then verify the live page renders, fonts load, search responds, and the Marketing studio can generate and display saved content.
5. Verify the signed-in Till page and deposit form, the assistant connection instructions, and the Capital walkthrough in English, Kiswahili, Sheng, and Kenglish. Report voice availability per browser/device.

## User-dependent checks
- A real M-Pesa payment requires you to approve the prompt with your PIN. Never simulate a successful payment; confirm wallet and transaction changes only after a genuine Safaricom callback.
- Connecting ChatGPT requires you to complete the Quick start sign-in in the app. Voice availability on a physical phone and the Vercel redirect allow-list also require your action.
- If the managed payment credentials or production build settings are unavailable, stop at that prerequisite and name exactly what is missing; do not invent values.

## Technical details
- Use the existing Lovable-managed backend configuration; keep publishable settings out of source code and never expose private payment credentials.
- Do not change unrelated security findings, payment behavior, or unrelated product features during the startup repair.
