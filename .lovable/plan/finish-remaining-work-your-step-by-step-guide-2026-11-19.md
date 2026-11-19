# Finish remaining work + your step-by-step guide

## Part A — what I will do
1. **Fix the two warnings**: block users from giving themselves a "verified" badge (only the system/admins can set it), and defuse spreadsheet formulas in conversation report downloads. Mark both fixed.
2. **Page-by-page check**: sign in as the test account and walk every page at phone and desktop width; click main buttons, forms and dialogs; fix what's broken.
3. **Voice wording**: polish the Capital voice guide and repayment summary in English, Kiswahili, Sheng' and Kenglish (natural phrasing, KES read clearly, short sentences).
4. **Live signed-in check**: on the live link, test search, Marketing (generate + saved in history) and Till (balance, history, deposit form).
5. Fresh security scan, then publish.

## Part B — your step-by-step guide (I'll also add it as a "Setup checklist" page in Admin)

**1. Connect the Vercel site to this backend**
- Open vercel.com, go to your project, then Settings, then Environment Variables.
- Replace the three values `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID` with this project's values (I'll show the exact public values in the checklist page; they are safe to share, not secret).
- Delete any AI keys from Vercel (they must never be in the website).
- Go to Deployments, then click Redeploy on the latest one.

**2. Allowed return links**
- In Lovable: More, then Users, then Auth settings, then Advanced, then Redirect URLs.
- Add `https://craft-your-journey-ecru.vercel.app/**` and save.
- Test: on the Vercel site, sign in, then use "Forgot password" and check the email brings you back to Vercel.

**3. Small real M-Pesa payment**
- Make sure your phone number is saved in your Profile (format 07XX...).
- Open the Till page, then Deposit, enter KES 10, then Send.
- Your phone shows the M-Pesa prompt: enter your PIN.
- Tell me when done and I'll confirm the balance and transaction status updated.

**4. Connect ChatGPT**
- ChatGPT, then Settings, then Connectors (turn on Developer mode if asked), then Add connector.
- Paste the MCP URL from the Connect your AI assistant page (use its Copy button).
- Sign in with your SmartReach account and approve access.
- Ask "List my customers", then "Add customer Jane, 0712345678".

**5. Listen to the voice guide**
- On your phone, open the live link, then Capital, then "Guide me by voice".
- Try each language: English, Kiswahili, Sheng', Kenglish.
- Note for each one whether it speaks or shows "plays as text", and tell me.

**6. Pick one financing model**
- Choose either the Renewed KES 19.5M plan or the Source-of-Truth Baseline figures and tell me; I'll make every page use those numbers and save that choice.
