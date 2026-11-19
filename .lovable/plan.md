# Fix the missing AI key on the Vercel site and restore the blank live page

## What the check found
- This Lovable project runs on its own Lovable Cloud backend (not `kvvaaupclqzjelgcsrbe`). That backend already has the managed AI key, and AI generation in Marketing worked in the preview earlier.
- The Vercel site (craft-your-journey-ecru.vercel.app) is wired to a different backend, `kvvaaupclqzjelgcsrbe`. Lovable does not manage that backend, so it cannot put its managed AI key there. That is why the five AI functions fail only on the Vercel site.
- No other Lovable project is overwriting secrets here: the two sites just use two separate backends.
- The Lovable live link (craft-your-journey-35.lovable.app) is still blank because its last build lacked the backend settings.

## Work
1. Republish the Lovable live link so it builds with the backend settings, then confirm it renders.
2. Sign in on the live link and test generate-content, ai-help-chat, wellness-ai-chat, analyze-customer-sentiment and suggest-reply with real requests; report the actual results.
3. If any function rejects the AI key, rotate it once using the supported mechanism and retest. Never create, copy or expose a key.
4. For the Vercel site, choose one (your decision):
   - A. Point the Vercel build at this project's Lovable Cloud backend (recommended — data, sign-in and AI all match the Lovable link), or
   - B. Keep `kvvaaupclqzjelgcsrbe` and use your own AI provider key there, set in that backend's secrets by you.
5. No changes to database records, sign-in, migrations or security rules.

## Uploaded files
- The notes and screenshots match this finding. Full review of the long documents was delivered earlier; duplicates are exact copies.
