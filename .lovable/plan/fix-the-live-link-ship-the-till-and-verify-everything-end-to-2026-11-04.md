# Fix the live link, ship the till, and verify everything end to end

## What's wrong with the live link (confirmed)

The published site loads its app file but the app crashes the moment it starts with
`supabaseUrl is required.` The published bundle was built without its backend address
settings, so `#root` stays empty — a blank white page. The project checkout has the
correct `.env` (backend URL, project ID, publishable key), so this looks like a build
that ran without the environment attached, not a code bug.

Step 1 is to re-publish and prove the blank page is gone before anything else.

## Plan

### 1. Fix the blank live link
- Re-publish the current app, then open the live link in a real browser and confirm:
  the page renders, and the startup error is gone from the console.
- If it is still blank after the re-publish, compare the published app file with a
  locally built one to find where the backend address is being dropped, fix that, and
  publish again. (Publishing is requested only after this step is green.)

### 2. Build a real Till page (`/till`)
- New page reachable from the sidebar, with:
  - **M-Pesa deposit form** — amount plus your registered phone (pre-filled, locked to
    the phone on your profile, matching the deposit security rule). Submitting calls the
    live `wallet-deposit` function, which sends the real STK push from your till.
  - **Live wallet balance** — subscribes to wallet changes so the balance updates the
    second a payment confirms, without a manual refresh.
  - **Transaction history** — deposits, sends and repayments with status
    (pending → completed / failed), exportable as today.
- Keep the existing Payments page untouched; Till is the daily-use page.

### 3. Real Safaricom confirmation test
- I trigger a small real deposit STK prompt from the Till page to your registered phone.
- **You enter your M-Pesa PIN on your phone** — I cannot approve the payment for you.
- I then watch the wallet balance and the transaction row move from pending to completed
  live, on the live link.

### 4. AI assistant on the live link
- Walk the Connect your AI assistant page on the live link: sign in through the consent
  flow with your account, confirm the connection page shows the live MCP URL and copy
  button, then exercise the four tools — list customers, add a customer, add the same
  one again (duplicate-safe, one record), and confirm everything stays scoped to your
  business.
- **Connecting ChatGPT itself needs you**: open the Quick start box on the live link,
  paste the URL into ChatGPT, and ask "List my customers". I will have verified the
  exact same steps on my side first.

### 5. Voice guide on the live link
- After the publish, open Capital on the live link and walk "Guide me by voice" through
  English, Kiswahili, Sheng' and Kenglish — language switch, restart, progress.
- Headless browsers have no speech engines, so I will confirm the correct language text,
  controls and the "plays as text on this device" fallback; how it *sounds* needs your
  phone.

### 6. Fonts, search and marketing studio on the live link
- Confirm Space Grotesk / Plus Jakarta Sans actually load (font requests allowed, no
  fallback fonts).
- Confirm the global search opens, searches and clears without looping.
- Generate a real marketing post in the AI studio, confirm it saves and displays on the
  live link.

### 7. Final checks and publish
- Full build + typecheck, then publish so all of the above (till page, fixes) reach the
  live link together, and re-verify the live link once more.

## Still yours to do (unchanged)
- Add `https://craft-your-journey-ecru.vercel.app/**` under More → Users → Auth settings
  → Advanced → Redirect URLs (no tool can edit that list).
- Enter your M-Pesa PIN when the deposit prompt arrives.
- Connect ChatGPT from the Quick start box.
