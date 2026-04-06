

## Plan: Fix Build Error + Comprehensive Feature Enhancement

### Immediate Fix
The build error is caused by `Brain` being used on line 74 of `DashboardLayout.tsx` but not included in the import statement (lines 3-30). `Brain` is a valid lucide-react icon — it just needs to be added to the import list.

**File:** `src/components/layout/DashboardLayout.tsx`
- Add `Brain` to the lucide-react import on line 3-30

---

### Phase 1: Biashara Mind Enhancements (per Master Prompt)

Based on the uploaded documents, the existing Biashara Mind module needs these upgrades:

**1a. Expand Daily Check-in Prompts Pool**
- Increase from 6 to 60 culturally-grounded daily questions (Swahili/English mix)
- Add morning time-awareness greeting: "Habari za asubuhi!" between 7-9 AM EAT
- File: `src/components/biashara-mind/DailyCheckin.tsx`

**1b. Enhanced Burnout Risk Score with 4 Zones**
- Current BRS uses GREEN/AMBER/ORANGE/RED — matches spec. Add Swahili zone descriptions from the master prompt (Unastawi, Angalia, Pumzika, Hatua ya haraka)
- Add animated pulse on nav icon when BRS is AMBER+ (DashboardLayout sidebar)
- File: `src/components/biashara-mind/BurnoutGauge.tsx`, `DashboardLayout.tsx`

**1c. Upgrade Rafiki AI System Prompt**
- Update `wellness-ai-chat` edge function with the comprehensive Biashara Mind system prompt from the master doc (4-step RECEIVE/VALIDATE/EXPLORE/RESOURCE protocol, cultural calibration, crisis keywords list)
- File: `supabase/functions/wellness-ai-chat/index.ts`

**1d. Enhanced Crisis Protocol**
- Add the expanded crisis keyword list from the doc: `["sitaki kuishi", "nauawa", "naomba msaada", "suicide", "I want to die", "kill myself", "no point", "end it all", "sina sababu", "naenda", "I give up on everything", "siwezi tena", "nimechoka maisha"]`
- Update crisis response with the exact Swahili-first empathetic message from the doc
- Update resource numbers to match doc: Befrienders Kenya 0800 723 253, Kenya Red Cross +254 703 037 000, AMREF 0800 720 021
- File: `supabase/functions/wellness-ai-chat/index.ts`, `src/components/biashara-mind/CrisisButton.tsx`

**1e. Micro-Journal Enhancements**
- Add 3 journaling modes: BIASHARA_YANGU, MIMI_MWENYEWE, SHUKRANI with mode-specific culturally-grounded prompts
- Add privacy badge: "Maneno yako yanabaki yako" with padlock icon
- File: `src/components/biashara-mind/MicroJournal.tsx`

**1f. Wellness Streak Milestones**
- Add milestone labels: 7 days = "Msimamizi", 30 days = "Kiongozi", 90 days = "Mzee"
- Display in DailyCheckin and Wellness page header
- File: `src/components/biashara-mind/DailyCheckin.tsx`, `src/pages/Wellness.tsx`

---

### Phase 2: CompetEdge Intelligence Upgrades

**2a. Enhanced Competitor Card with Momentum Score**
- Add animated progress ring showing momentum (0-100)
- Add growth status badges: Surging/Growing/Stable/Declining
- File: `src/components/competitors/CompetitorCard.tsx`

**2b. Reels Intelligence Grid Upgrade**
- Add "Viral Alert" badge when engagement > 2x average
- Add AI content analysis button calling `generate-content` edge function
- Add "Get Inspired" button that navigates to `/social` with pre-filled brief
- File: `src/components/competitors/CompetitorReelsFeed.tsx`

**2c. Hashtag Intelligence Panel**
- New component showing extracted hashtags from competitor mock data
- Hashtag frequency, average engagement, trending indicator
- "Use Winning Hashtags" one-click copy
- File: `src/components/competitors/HashtagIntelligence.tsx` (new)
- Integrate into Competitors page as new tab

---

### Phase 3: SmartReach Vision + Predict + Customer DNA

**3a. Vision Page Enhancement**
- Add batch processing UI (upload multiple products)
- Add background selection options from spec: White Studio, Market Scene, Outdoor Nairobi, Custom Color
- File: `src/pages/Vision.tsx`

**3b. Demand Forecast Integration**
- Wire `DemandForecast.tsx` into the Inventory page
- Add Kenyan market cycle awareness display (M-Pesa salary dates, Eid, holidays)
- File: `src/pages/Inventory.tsx`

**3c. Customer DNA Integration**
- Wire `CustomerDNA.tsx` into the Customers page
- Add churn risk indicators and segment badges
- File: `src/pages/Customers.tsx`

---

### Phase 4: Security Hardening

**4a. Enhanced Auth Security Logging**
- Log all failed login attempts with IP metadata via `log_security_event` RPC
- Already partially done — verify and ensure it fires consistently
- File: `src/components/auth/AuthForm.tsx`

**4b. IDOR Final Audit**
- Verify all mutation hooks scope to business_id/user_id (already fixed in prior iteration — confirm no regressions)

---

### Technical Details

**Files to modify (12):**
- `src/components/layout/DashboardLayout.tsx` — fix Brain import + add BRS pulse animation
- `src/components/biashara-mind/DailyCheckin.tsx` — expand prompts + milestone labels
- `src/components/biashara-mind/MicroJournal.tsx` — 3 journaling modes + privacy badge
- `src/components/biashara-mind/CrisisButton.tsx` — updated crisis resources
- `src/components/biashara-mind/BurnoutGauge.tsx` — Swahili zone descriptions
- `src/components/competitors/CompetitorReelsFeed.tsx` — viral alerts + "Get Inspired"
- `src/components/competitors/CompetitorCard.tsx` — momentum ring
- `src/pages/Wellness.tsx` — streak milestones display
- `src/pages/Inventory.tsx` — integrate DemandForecast
- `src/pages/Customers.tsx` — integrate CustomerDNA
- `src/pages/Competitors.tsx` — add Hashtag tab
- `supabase/functions/wellness-ai-chat/index.ts` — comprehensive system prompt upgrade

**Files to create (1):**
- `src/components/competitors/HashtagIntelligence.tsx`

**No new database migrations needed** — existing tables cover all data requirements.
**No new dependencies needed.**

