# Fix the blank app and finish the outstanding verification + M-Pesa work

## Root cause (confirmed this turn)

The project's backend configuration file `.env` is missing (only `.env.example` remains). Both the
preview and the published bundle were built without the backend address, so every page fails at
startup with `supabaseUrl is required` and renders white. This explains the blank live link and the
blank preview.

## Step 1 — Restore the backend configuration and fix the blank page

- Restore `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
  from the Lovable Cloud connection (these are public values meant to ship in the browser bundle).
- Confirm the preview renders and the build log shows a clean build.

## Step 2 — Publish and verify the live link

- Publish so the fix reaches https://craft-your-journey-35.lovable.app.
- On the live link, signed in: confirm the fonts load, the global search returns results, and the
  AI Marketing studio generates and saves a real post that displays correctly.

## Step 3 — Till page end to end

- Open /till signed-in: live wallet balance, transaction history, deposit dialog validation,
  CSV export.
- Trigger a real deposit: the form sends a real M-Pesa prompt to the registered phone number.
  **Your step: enter the M-Pesa PIN.** Then confirm the wallet balance and transaction status
  update live from the real Safaricom confirmation (not just the receiver check).

## Step 4 — Assistant connection + Capital voice guide on the live link

- Sign in on the live link, walk the "Connect your AI assistant" page and confirm the MCP URL.
- Walk the Capital voice guide in English, Kiswahili, Sheng and Kenglish, verifying each language
  switches and plays (or falls back to text where the device has no voice). Listening on your phone
  remains your step.
- **Connecting ChatGPT stays your step** (the Quick start box) — I verify the four tools work
  server-side as your signed-in user, business-scoped, with duplicate-safe customer creation.

## Step 5 — Full system sweep and repair

- Re-run the full signed-in walk of every page; fix any broken buttons, flows or errors found.
- Run the full build + type check; fix anything failing.
- Run a security scan and report results; fix nothing outside findings you name, per your standing rule.

## Step 6 — Final publish

- Publish the Till page, voice guide and any repairs so the live link matches the preview; verify
  the live link serves the new version.

## Still waiting on you (unchanged)

- Add `https://craft-your-journey-ecru.vercel.app/**` under More → Users → Auth settings → Advanced → Redirect URLs.
- Enter the M-Pesa PIN for the real test payment.
- Connect ChatGPT via the Quick start box on the live link.
- Listen to the voice guide on a real device.
- Ratify the financing model (KES 19.5M renewed vs the baseline numbers).
