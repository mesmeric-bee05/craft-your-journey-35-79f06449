# Go live with agent tools, duplicate-customer merge, security digests, voice layer

## Already in place (verify only, no rebuild)
- Remaining Work tab button in the Monitoring tab bar.
- Security scan runner calls the email digest after every scan.
- Security scan and finding-status alerts in the notification bell.
- Spoken repayment summary voice command, language switcher (English / Kiswahili / Sheng' / Kenglish), voice confirm steps on Capital.
Each gets a quick check; only gaps found are fixed.

## 1. Agent tools: finish, test, publish
- Regenerate the assistant tool list and review the four tools' inputs (create_customer now needs phone or email).
- Full build + typecheck.
- Security tests:
  - call without sign-in is refused (401) with sign-in discovery info returned;
  - source check: no service-role key and no wellness, crisis, wallet, payment, Capital or secrets tables in the agent tool code;
  - repeat "add customer" returns the existing customer (database test as a real signed-in user).
- Publish, then confirm the live endpoint answers (refuses without sign-in, discovery works).
- Real assistant sign-in: I can't sign in to your Claude/ChatGPT account. I will walk the Connect page and the approval screen in the browser as your SmartReach user; you do the final "Add connector" step in Claude or ChatGPT and I check the result in the logs.

## 2. Duplicate customers merged at database level
- New merge function (owner/team member of the business only): moves conversations, messages, orders/transactions references, tags and notes from the duplicate to the kept customer, then deletes the duplicate. Every merge is recorded in the audit log.
- Auto-merge on save: a database rule normalises phone (+254) and lowercases email; when a new or edited customer matches an existing one in the same business, the details are folded into the existing customer instead of creating a second one.
- Clean up the 5 existing duplicate email groups via the same merge (keeping the oldest record), then add unique rules on phone and email per business so duplicates can't return.
- Customers page: "Possible duplicates" banner and a Merge button on each matching card, with a confirm dialog showing which record is kept.

## 3. Security digest emails
- Request two secrets via the secure form: RESEND_API_KEY and SECURITY_ALERT_FROM (e.g. `SmartReach Security <security@yourdomain>`). Note: the sender domain must be verified in Resend, otherwise only your own Resend account email receives mail.
- After you save them: trigger a scan, confirm the digest reports sent, and you confirm the inbox. If you'd rather not use Resend, the built-in Lovable email can be used instead.

## 4. Records
- Update roadmap.md and AGENTS.md (merge function is the single path for combining customers).

## Needs you
- Enter the Resend key and sender address in the secure form.
- Complete the final connect step inside Claude or ChatGPT.
