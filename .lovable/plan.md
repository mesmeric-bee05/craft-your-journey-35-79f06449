

## Plan: Full-Depth Security Hardening, AI Wellness, and Feature Activation

### Current State Assessment

The project already has solid security foundations: JWT auth on all edge functions, server-side rate limiting, Zod input validation, CSP headers, client-side rate limiting on auth forms, 30-min session timeout, sanitization utilities, and proper RLS policies. The main gaps are:

1. **Wellness AI** — MoodTracker and journal exist but have no AI-powered responses
2. **Competitor Reels** — static mock data with no real interaction
3. **Several non-functional buttons** across pages (Quick Actions on dashboard, etc.)
4. **IDOR risk** — some hooks don't guard business_id scoping on mutations
5. **Missing `updated_at` trigger** on `competitors` table
6. **Notification sound** — still references `/notification.mp3` file in useNotifications (old code) instead of the base64 hook
7. **Wellness data persistence** — mood/journal only in localStorage, not database

---

### 1. Wellness AI Companion (Edge Function)

Create a new `wellness-ai-chat` edge function that provides empathetic, evidence-based mental health support responses when users log moods or journal entries.

- Endpoint accepts `{ mood, journalText, history }` 
- Uses Lovable AI (`google/gemini-2.5-flash-lite`) with a wellness-focused system prompt
- Full auth + rate limiting (10/min) + Zod validation
- Integrate into `MoodTracker.tsx` — after logging a mood, call the function and display a supportive AI message
- Add a "Talk to AI" mini-chat inside the Wellness page

### 2. Database: `wellness_entries` Table + Competitors Trigger

**Migration SQL:**
```sql
-- Persist wellness data to database
CREATE TABLE public.wellness_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('mood', 'journal')),
  mood TEXT,
  mood_value INTEGER,
  content TEXT,
  ai_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wellness_entries ENABLE ROW LEVEL SECURITY;

-- IDOR Protection: Users can only access their own entries
CREATE POLICY "Users manage own wellness entries"
  ON public.wellness_entries FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger to competitors
CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. Security Hardening — IDOR Prevention Audit

Fix mutations across hooks to ensure business_id scoping:

- **`useCompetitors.tsx`** — `deleteCompetitor` currently only filters by `id`. Add `.eq('business_id', businessId)` to prevent cross-business deletion.
- **`useCustomers.tsx`** — Verify `deleteCustomer` and `updateCustomer` include `business_id` filter.
- **`useNotifications.tsx`** — Fix `markAsRead` and `markAsClicked` to include `.eq('user_id', user.id)` filter to prevent unauthorized notification manipulation.
- **`useMessages.tsx`** — `sendMessage` should verify conversation belongs to user's business (RLS handles this, but add client-side guard).

### 4. Fix Notification Sound Duplication

`useNotifications.tsx` still creates `new Audio('/notification.mp3')` directly. Replace with the base64 data URI from `useNotificationSound.tsx` or import and use the existing hook. Remove dead code path.

### 5. Competitor Reels — Functional Interactions

Make the Reels feed interactive:
- **Save for Reference** button saves bookmarked competitor content to localStorage with a "Saved" badge
- **Content Gap Analysis** button calls the existing `generate-content` edge function with competitor context to suggest content ideas
- Add filter pills by platform (Instagram, TikTok, YouTube) that actually filter the feed
- Add "Analyze Niche" button on CompetitorTracker that generates AI insights via existing edge function

### 6. Dashboard Quick Actions — Wire Up All Buttons

Review `QuickActions.tsx` and ensure every action navigates or triggers real functionality:
- "New Conversation" → navigate to `/inbox`
- "Create Campaign" → navigate to `/marketing`  
- "Schedule Post" → navigate to `/social`
- "View Reports" → navigate to `/reports`

### 7. Security Logging Enhancement

Add client-side security event logging for:
- Failed login attempts (already rate-limited, now also logged via `log_security_event` RPC)
- Password changes
- Profile updates with sensitive fields

Update `AuthForm.tsx` to call `supabase.rpc('log_security_event', ...)` on failed sign-in after rate limit check.

---

### Technical Details

**New files:**
- `supabase/functions/wellness-ai-chat/index.ts` — AI wellness companion endpoint

**Modified files:**
- `src/components/wellness/MoodTracker.tsx` — persist to DB, show AI responses
- `src/components/wellness/MentalHealthWidget.tsx` — persist journal to DB
- `src/components/competitors/CompetitorReelsFeed.tsx` — save/filter functionality
- `src/components/competitors/CompetitorTracker.tsx` — AI niche analysis button
- `src/hooks/useCompetitors.tsx` — IDOR fix (add business_id to mutations)
- `src/hooks/useNotifications.tsx` — IDOR fix + fix notification sound
- `src/components/dashboard/QuickActions.tsx` — wire navigation
- `src/components/auth/AuthForm.tsx` — security event logging
- `supabase/config.toml` — add wellness-ai-chat function config

**Database migration:**
- Create `wellness_entries` table with strict user-only RLS
- Add `updated_at` trigger on `competitors`

**No new dependencies needed.**

