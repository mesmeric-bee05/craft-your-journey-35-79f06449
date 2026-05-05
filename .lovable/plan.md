## Plan: Phase 3 — Production Hardening & Final Feature Wiring

### Context
Phases 1 & 2 are complete (landing page, Biashara Mind, wellness sync, breathing exercise, wins timeline). Now focusing on remaining gaps: security headers, dashboard data wiring, empty states, page transitions, and Vision page split-view.

---

### 1. Security Hardening

**1a. Add CSP & security meta tags to `index.html`**
Add Content-Security-Policy, X-Frame-Options, Referrer-Policy meta tags to mitigate XSS, clickjacking, and referrer leakage.

**1b. Run security scan & linter**
Run `security--run_security_scan` and `supabase--linter` to catch any RLS gaps or exposed data. Fix any critical findings (missing RLS, overly permissive policies).

**1c. Audit `as any` casts**
Document type-gap areas in `useBiasharaMind.tsx` (Supabase types not yet regenerated for new tables) — leave casts but add TODO comments.

**1d. maxLength audit**
Verify `Textarea`/`Input` in MicroJournal, WinsVault, RafikiChat, BusinessSettings all have `maxLength` to prevent oversized payloads.

---

### 2. Dashboard Data Wiring

**2a. `LiveActivityFeed.tsx`**
Wire to real `messages` + `conversations` tables (latest 10 events) via Supabase, with realtime subscription. Replace static placeholders.

**2b. `WellnessScoreCard.tsx`**
Confirm BRS pulls from `useBiasharaMind` (`latestBRS`, `streak`, `tokenBalance`) — already partially done; verify rendering with empty state.

**2c. Dashboard mobile spacing**
Audit grid gaps on small viewports (currently `<948px`). Use `gap-3 md:gap-6` pattern.

---

### 3. UI/UX Polish

**3a. Page transitions**
Add `animate-fade-in` to root `<div>` of: `Dashboard.tsx`, `Inbox.tsx`, `Customers.tsx`, `Inventory.tsx`, `Competitors.tsx`, `Vision.tsx`, `Wellness.tsx`, `Analytics.tsx`, `Reports.tsx`, `Marketing.tsx`, `Settings.tsx`.

**3b. Empty states**
- `Customers.tsx`: empty state with Users icon + "Add your first customer" CTA
- `Inventory.tsx`: empty state with Package icon + "Add your first product" CTA
- `Competitors.tsx`: empty state with Eye icon + "Track your first competitor" CTA

**3c. Wellness mobile tabs**
Add `overflow-x-auto` wrapper to `TabsList` for horizontal scroll on mobile.

---

### 4. Feature Completion

**4a. Vision page split-view (`Vision.tsx`)**
Add 2-column layout: original upload (left) + AI analysis/tips (right). Show before/after preview when AI image enhancement returns. Mobile stacks vertically.

**4b. QuickActions toast feedback**
Already navigates correctly — add `toast.info()` on landing pages confirming the action arrival (low priority polish).

**4c. CompetEdge mobile reels feed**
Verify `CompetitorReelsFeed.tsx` cards stack on small screens (`flex-col md:flex-row`).

---

### Technical Details

**Files to modify (≈12):**
- `index.html` — CSP + security meta tags
- `src/components/dashboard/LiveActivityFeed.tsx` — real data + realtime
- `src/pages/Dashboard.tsx` — mobile spacing, fade-in
- `src/pages/Customers.tsx`, `Inventory.tsx`, `Competitors.tsx`, `Vision.tsx`, `Wellness.tsx`, `Analytics.tsx`, `Reports.tsx`, `Marketing.tsx`, `Settings.tsx`, `Inbox.tsx` — fade-in + empty states where applicable
- `src/components/competitors/CompetitorReelsFeed.tsx` — mobile responsive verify
- `src/hooks/useBiasharaMind.tsx` — TODO comments for type casts

**Database:** No new migrations. Will run linter + security scan and fix any flagged issues.
**Dependencies:** None new.
