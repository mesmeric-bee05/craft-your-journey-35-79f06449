# Roadmap

## Open (needs the user)
- Vercel site uses a different backend (kvvaaupclqzjelgcsrbe) that Lovable can't give its AI key to: choose to point Vercel at this project's backend, or add your own AI key there.
- Add `https://craft-your-journey-ecru.vercel.app/**` under More → Users → Auth settings → Advanced → Redirect URLs (only you can edit this list), then sign in on the Vercel site.
- Real M-Pesa payment: saved keys are Safaricom test keys (test Paybill ending 379, test mode). Needs live Daraja keys + your real Paybill number + passkey from Safaricom go-live, then switch to live mode; then KES 10 deposit on Till with your PIN.
- Connect ChatGPT via the Quick start box on Connect your AI assistant, ask "List my customers".
- Listen to the Capital voice guide in all four languages on a real device (browser voices vary).
- Ratify one financing model (KES 19.5M renewed plan vs baseline figures) and retire the older KES 38M plan.

## In progress
- Deep security review running; fix what it finds.
- Admin form to validate live Safaricom keys (storing them uses the secure key form).
- Track deposit attempts, wallet credits and failed payments.
- Continue with Lovable button; verify Google sign-in on the live link.
- In-app voice test for the four languages.
- Live checks: search, Marketing post, Google sign-in.
- Publish M-Pesa deposit, Capital redirect fix, voice guide (publish scheduled).
- Full system test sweep: marketing content generation, voice assistant quality, all pages/buttons.

## Done
- Both payment-prompt paths now follow one live/test switch; Paybill confirmed; admin "Check my M-Pesa keys" button on Setup checklist.
- Live link pointed at the wrong backend (settings file not saved with project); fixed.
- Telegram/M-Pesa criticals and verified-badge/CSV warnings fixed; tab bars fit phones; Setup Checklist page in admin menu.
- Live link pointed at the wrong backend because the settings file wasn't saved with the project; fixed.
- Telegram/M-Pesa criticals and verified-badge/CSV warnings fixed; tab bars fit phones; Setup checklist page at Admin → Setup Checklist.
- Live link no longer blank (republished, renders, no errors).
- AI key verified on this project's backend: content, help chat, Rafiki, sentiment and reply suggester all answer; fixed empty reply suggestions and cut-off Rafiki replies.
- Document review: Source-of-Truth Baseline is the strongest synthesis but needs founder ratification; Renewed KES 19.5M financials likely supersede the KES 38M plan; numbered doc copies are exact duplicates. Verdict table delivered in chat.
- Assistant tools tested on the live link as the owner: list, add, repeat add returns same customer, stays in own business.
- "Send test digest" button in Admin monitoring → Security; test digest sent.
- Repayment summary uses real Capital figures and refreshes every 30s.
- Voice guide, search/spreadsheet protections published; security re-scan clean.
- Remaining Work tab, digest after every scan, bell alerts, MCP integration.
