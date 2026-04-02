

## Plan: Mental Health AI, Competitor Intelligence, and Feature Expansion

### Overview

Add three major new features — a Mental Health AI wellness companion, a Competitor Niche Tracker with real-time insights, and a Social Reels/Video Feed for competitor monitoring — plus continue hardening security and fixing existing gaps.

---

### 1. Mental Health AI Wellness Widget

**New file:** `src/components/wellness/MentalHealthWidget.tsx`

A dashboard-accessible wellness tool for business owners experiencing entrepreneurial stress. Features:
- Mood check-in selector (5 moods: Great, Good, Neutral, Low, Stressed)
- AI-powered supportive responses using the existing `ai-help-chat` edge function pattern (Lovable AI — no API key needed)
- Daily wellness tips carousel (productivity, burnout prevention, work-life balance)
- Breathing exercise timer (4-7-8 technique with animated circle)
- Journaling quick-entry that saves to localStorage
- Stress level tracker with weekly mood chart (using Recharts)

**New file:** `src/pages/Wellness.tsx` — full page with mood history, journal entries, guided exercises

**Modify:** `src/components/layout/DashboardLayout.tsx` — add "Wellness" nav item with Heart icon  
**Modify:** `src/App.tsx` — add `/wellness` route

---

### 2. Competitor Niche Tracker

**New file:** `src/components/competitors/CompetitorTracker.tsx`

A competitor intelligence dashboard showing:
- Add/manage competitor profiles (name, industry, social handles, website)
- Niche positioning map (quadrant chart: price vs quality, using Recharts ScatterChart)
- Competitor activity feed showing simulated real-time updates
- SWOT analysis cards for each competitor (editable)
- Market trends panel with AI-generated niche insights

**New file:** `src/components/competitors/AddCompetitorDialog.tsx` — form to add competitors  
**New file:** `src/components/competitors/CompetitorCard.tsx` — individual competitor display  
**New file:** `src/pages/Competitors.tsx` — full page with tabs: Overview, Feed, Analysis

**Database migration:** Create `competitors` table:
```sql
CREATE TABLE public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  social_handles JSONB DEFAULT '{}',
  industry TEXT,
  notes TEXT,
  swot JSONB DEFAULT '{"strengths":[],"weaknesses":[],"opportunities":[],"threats":[]}',
  metrics JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
-- RLS: business members can CRUD their own competitors
```

**Modify:** `DashboardLayout.tsx` — add "Competitors" nav item with Target icon  
**Modify:** `App.tsx` — add `/competitors` route

---

### 3. Social Reels / Video Feed (Competitor Content Monitor)

**New file:** `src/components/competitors/CompetitorReelsFeed.tsx`

A TikTok/Instagram Reels-style vertical scrolling feed that displays:
- Competitor content cards with video-style previews (gradient thumbnails with play overlay since actual videos require API integrations)
- Each card shows: competitor name, platform badge, post content preview, engagement metrics (simulated), posted date
- Swipe/scroll interaction with snap scrolling
- Filter by competitor or platform
- "Save for reference" action that bookmarks content locally
- Content gap analysis panel — AI-suggested content ideas based on what competitors are posting

This integrates into the Competitors page as a "Reels" tab.

---

### 4. Security Hardening (Continued)

**Audit log INSERT policy fix:** The current `audit_logs` INSERT policy only allows `service_role`. But the `log_security_event()` function is `SECURITY DEFINER` and inserts correctly. Confirm this is working — no change needed.

**Add notification sound file:** Create a simple notification audio file at `/public/notification.mp3` (generate a short beep tone via edge function or embed a base64 data URI in the hook to avoid a missing file 404).

---

### 5. Dashboard Integration

Add a "Wellness Score" mini-card to the Dashboard page showing the user's latest mood and streak count (days of consecutive check-ins).

---

### Technical Details

**New pages and routes:**
| Route | Page | Nav Label |
|-------|------|-----------|
| `/wellness` | `Wellness.tsx` | Wellness |
| `/competitors` | `Competitors.tsx` | Competitors |

**New files (8):**
- `src/pages/Wellness.tsx`
- `src/pages/Competitors.tsx`
- `src/components/wellness/MentalHealthWidget.tsx`
- `src/components/wellness/BreathingExercise.tsx`
- `src/components/wellness/MoodTracker.tsx`
- `src/components/competitors/CompetitorTracker.tsx`
- `src/components/competitors/AddCompetitorDialog.tsx`
- `src/components/competitors/CompetitorReelsFeed.tsx`

**Modified files (2):**
- `src/components/layout/DashboardLayout.tsx` — add Wellness + Competitors nav items
- `src/App.tsx` — add 2 new routes

**Database migration:**
- Create `competitors` table with full RLS policies
- Add `wellness_entries` table for mood/journal persistence (optional — can start with localStorage)

**No new dependencies needed.** Uses existing Recharts, Lucide icons, Tailwind, and Supabase client.

