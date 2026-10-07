# Assistant live test, scan + bell check, voice layer, freelancer/review tightening

## 1. Live assistant test (on the published link)
- Do the same sign-in an assistant does: register a test assistant with the live sign-in service, open the approval page in a browser while signed in as your SmartReach account, approve, and receive the assistant's access pass.
- Using that pass on the live connection:
  - list customers;
  - add a new test customer, then add it again (the same customer should come back, not a copy);
  - read the SmartReach score and products.
- Check against the database that every returned customer and product belongs to your business only, and that the new customer landed in your business.
- Delete the test customer afterwards.
- If the project has more than one account, I'll ask which to test as.

## 2. Security scan, digest, bell
- Run a fresh scan, then check that the digest reports "sent" with no errors, and confirm a new alert appears in the notification bell.
- I can't open your inbox, so you confirm the email (check spam too).

## 3. Tighten freelancer profiles and reviews
- Freelancer profiles: readable only by the freelancer themself, and by signed-in users who own or belong to a business (the people who hire).
- Reviews: readable only by the reviewer, the person reviewed, and the two sides of that job's contract.
- Check the Talent pages still load for a business owner, then re-scan and confirm both warnings are gone.

## 4. Voice commerce layer (English, Kiswahili, Sheng', Kenglish)
- **Spoken application steps:** a "Guide me by voice" button on Capital walks through amount, revenue share, documents, review and submit. Each step is read aloud in the chosen language, with Next, Back and Repeat. Submitting still needs an on-screen tap.
- **Spoken repayment summary:** fixed, translated sentences for each language, filled with your real figures (advance, balance, last repayment, total repaid, last nightly collection). It plays even if the AI answer is unavailable; the AI answer is used when present.
- **Language switches:** read-aloud picks a Kenyan voice where the device has one (sw-KE / en-KE), falling back to the closest available voice. Switching language mid-walkthrough keeps your current step.
- Test each language in the browser: summary text and all steps render, and switching keeps your place.

## 5. Publish and connect
- Publish so the latest Connect page and fixes go live.
- ChatGPT: I can't sign in to your ChatGPT account. The live test in step 1 proves the four tools work end to end. You then connect ChatGPT from the Quick start box, and I check the server logs to confirm its calls succeeded.

## Technical notes
- New database rules replace the current freelancer_profiles and reviews read rules.
- Voice phrases live in the existing language dictionary. The walkthrough is a new Capital component that uses the browser's built-in read-aloud.
- Update roadmap.md and AGENTS.md.

## Needs you
- Confirm the digest email arrived.
- Do the final ChatGPT connect step.
