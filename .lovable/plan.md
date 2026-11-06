# Restore the live app and finish the requested checks

## Verified starting point
- The local preview renders its public homepage, but the published site still fails at startup with “supabaseUrl is required.”
- The current project copy is missing its backend build configuration file.
- The Till page, M-Pesa deposit flow, four-language Capital voice guide, and four authenticated assistant tools are present in the project.
- Secure M-Pesa credential names are configured, but their values and live-versus-sandbox behavior are not exposed for inspection.

## Work
1. Restore the app’s managed Lovable Cloud build settings without inventing or exposing credentials; confirm the preview loads and signed-in pages can open.
2. Re-publish once the preview is healthy, then verify the live homepage, font loading, global search, and AI Marketing page. Test content generation and confirm a generated post saves and displays; do not claim success if live credentials or account access prevent it.
3. On the live signed-in Till page, verify the balance, transaction history, and deposit dialog. Confirm deposits remain locked to the account’s registered phone. If the production M-Pesa setup is ready, request the minimum supported KES 1 STK prompt; the user enters their PIN. Then verify the same transaction and wallet balance update from Safaricom’s callback. Never simulate a successful payment or report a real payment without callback evidence.
4. Walk the live “Connect your AI assistant” instructions. The user completes ChatGPT sign-in and permission approval; then verify the four existing tools as that signed-in user, including business-scoped customer listing and retry-safe customer creation.
5. Open Capital on the live site and test the English, Kiswahili, Sheng, and Kenglish guide controls, restart, and repayment summary. Report which languages have an available device voice and which use text or fallback; physical-device listening remains unverified unless tested on that device.
6. Run the project’s available build, type checks, and focused checks for the touched flows; review the current security scan. Do not modify or dismiss unrelated security findings.
7. Publish the final verified changes and recheck the live pages.

## Technical details and dependencies
- The app reads its public backend URL and publishable key at build time; restore these from the managed project connection, never from a guessed placeholder or private key.
- A live deposit is a real-money action. Use KES 1 only as the smallest configured test amount, and wait for the user to approve the phone prompt by entering their PIN.
- Assistant access requires the user to sign in and approve the connection in ChatGPT. Real speech quality depends on voices installed on the tested device.