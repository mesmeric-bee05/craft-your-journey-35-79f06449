

## Plan: Video Tutorials Activation, Security Fixes, and Feature Expansion

### Problem Analysis

1. **Video Tutorial Play Buttons (Screenshot):** Currently clicking any tutorial card shows a toast saying "coming soon." The user wants these to actually work.
2. **Security Vulnerabilities:** 4 critical findings — all `*_safe` views are still `security_definer` (the previous migration did not successfully convert them to `security_invoker`). They bypass RLS entirely.
3. **Feature gaps across modules** that need continued development.

---

### Implementation Plan

#### 1. Fix Safe Views Security (Database Migration)

Drop and recreate all 4 views (`profiles_safe`, `transactions_safe`, `customers_safe`, `live_streams_safe`) using explicit `CREATE OR REPLACE VIEW ... WITH (security_invoker = true)` syntax. The previous migration likely failed silently or used incorrect syntax.

#### 2. Video Tutorial Player Modal

Create a `VideoPlayerDialog.tsx` component that opens when a tutorial card is clicked:
- Full-screen dialog with the tutorial title and category badge
- Since actual video files do not exist, build an **interactive walkthrough player** that displays step-by-step slides for each tutorial topic with animated content
- Each tutorial maps to 3-5 walkthrough steps with illustrations (gradient backgrounds, icons, descriptive text)
- Navigation controls: Previous / Next / Close
- Progress indicator showing current step
- Mark tutorials as "watched" in local state with a checkmark badge

Update `VideoTutorialsSection.tsx`:
- Replace the toast handler with dialog open logic
- Add "Watched" badge overlay on completed tutorials
- Track watched state via `useState`

#### 3. Enhanced Notifications with Real Badge Counts

Update `DashboardLayout.tsx` sidebar:
- Replace the hardcoded `badge: 12` on Social Inbox with actual unread conversation count from the `useConversations` hook (or a lightweight count query)

#### 4. Reports Page — Add Contact/Customer Export

Extend the existing CSV export in `Reports.tsx` to include a proper customer report export with name, email, channel, tags, and engagement metrics.

#### 5. Getting Started Guide — Persist Completion State

Update `GettingStartedGuide.tsx` to persist completed steps to `localStorage` so progress survives page refreshes. Key: `smartreach_onboarding_steps`.

---

### Technical Details

**Video Walkthrough Data Structure:**
```typescript
interface WalkthroughStep {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}
// Each tutorial ID maps to an array of WalkthroughStep
```

**View Recreation SQL Pattern:**
```sql
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe
WITH (security_invoker = true) AS
SELECT ... CASE WHEN user_id = auth.uid() THEN email ELSE NULL END ...
FROM public.profiles;
GRANT SELECT ON public.profiles_safe TO authenticated, anon;
```

**Files to create:**
- `src/components/help/VideoPlayerDialog.tsx`

**Files to modify:**
- `src/components/help/VideoTutorialsSection.tsx` — integrate dialog + watched state
- `src/components/help/GettingStartedGuide.tsx` — localStorage persistence
- `src/components/layout/DashboardLayout.tsx` — dynamic inbox badge

**Database migration:**
- Recreate all 4 safe views with `security_invoker = true`

