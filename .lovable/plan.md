

## Plan: Comprehensive Project Enhancement — UI/UX Polish, Feature Completion, Security Hardening

### Current State
The project has strong foundations: auth, onboarding, Biashara Mind wellness module, competitor intelligence, inventory, CRM, and a landing page. Key gaps include inconsistent crisis resource numbers in RafikiChat vs CrisisButton, some non-functional UI elements, landing page missing new features (Biashara Mind, Vision, CompetEdge), and several polish opportunities.

---

### Phase 1: Fix Inconsistencies and Dead Code

**1a. Sync Crisis Resources in RafikiChat.tsx**
The `RafikiChat.tsx` component has outdated crisis numbers (`+254 722 178 177`, `1199`, `+254 20 445 2068`) that don't match the authoritative list in `CrisisButton.tsx` and the edge function. Update to match: Befrienders Kenya `0800 723 253`, Kenya Red Cross `+254 703 037 000`, AMREF `0800 720 021`.

**1b. Fix `useBiasharaMind.tsx` type casts**
The hook uses `as any` type casts on Supabase table names (`mental_health_checkins as any`). These should reference the proper types or use validated table names. Clean up for type safety.

---

### Phase 2: Landing Page Enhancement

**2a. Add Missing Feature Cards**
The landing page features array only lists 8 features. Add:
- Biashara Mind (wellness/mental health)
- SmartReach Vision (AI product photography)
- CompetEdge Intelligence (competitor monitoring)
- Automation Workflows

**2b. Add a "Trusted By" / Social Proof section**
Add a partner/integration logos strip between hero and features (M-Pesa, WhatsApp, Instagram, TikTok, Safaricom).

**2c. Enhance Hero with Animated Gradient**
Add a subtle animated mesh gradient background to the hero section for a more premium feel.

**2d. Add FAQ Section**
Add an accordion-based FAQ section before the CTA, addressing common questions about data privacy, M-Pesa integration, Swahili AI, and pricing.

**2e. Mobile Navigation**
Add a hamburger menu for the landing page nav on mobile (currently hidden on small screens).

---

### Phase 3: Dashboard Polish

**3a. Add Recent Activity Feed Enhancement**
Wire `LiveActivityFeed` to show real data from conversations/messages tables rather than static placeholders.

**3b. Add WellnessScoreCard Data**
Ensure `WellnessScoreCard` on the dashboard pulls real BRS data from the `useBiasharaMind` hook.

---

### Phase 4: UI/UX Improvements Across Pages

**4a. Smooth Page Transitions**
Add `animate-fade-in` class consistently to all page roots (some pages have it, some don't).

**4b. Empty States**
Add illustrated empty states for Customers, Inventory, and Competitors when there's no data, with clear CTAs.

**4c. Mobile Responsive Audit**
- Fix Wellness page tabs to scroll horizontally on small screens
- Ensure Competitor Reels feed cards stack properly on mobile
- Fix Dashboard stats grid spacing on mobile

---

### Phase 5: Feature Completion

**5a. Wire QuickActions to Use Toast Confirmations**
Quick Actions already navigate via `Link` (confirmed working). Add toast feedback when arriving at destination pages.

**5b. Breathing Exercise Enhancement**
Currently the `BreathingExercise` component exists but verify it's integrated into the "My Growth" tab of Wellness. Add guided breathing animations (inhale/hold/exhale visual circle).

**5c. WinsVault Enhancement**
Ensure WinsVault allows adding wins with tags and displays them in a timeline format.

**5d. Vision Page — Add Before/After Preview**
Add a split-view UI showing the original upload alongside the AI tips, making the workflow more intuitive.

---

### Phase 6: Security Final Pass

**6a. Ensure all `as any` casts are audited**
The `useBiasharaMind` hook and some other hooks cast table names with `as any`. While these work at runtime, they bypass type safety. Document these as known type-gap areas.

**6b. Add CSP meta tag to index.html**
Add a Content Security Policy meta tag to `index.html` to restrict script sources.

**6c. Validate all form inputs have maxLength**
Audit all `Textarea` and `Input` components to ensure they have `maxLength` props set, preventing oversized payloads.

---

### Technical Details

**Files to modify (14):**
- `src/pages/Index.tsx` — expanded features, FAQ section, mobile nav, social proof strip
- `src/components/wellness/RafikiChat.tsx` — sync crisis resources
- `src/pages/Wellness.tsx` — ensure BreathingExercise is in correct tab
- `src/pages/Dashboard.tsx` — verify data flow for WellnessScoreCard
- `src/components/dashboard/WellnessScoreCard.tsx` — wire to real BRS data
- `src/components/dashboard/LiveActivityFeed.tsx` — real data integration
- `src/pages/Customers.tsx` — empty state
- `src/pages/Inventory.tsx` — empty state, animation
- `src/pages/Competitors.tsx` — empty state, animation
- `src/pages/Vision.tsx` — before/after UI
- `src/hooks/useBiasharaMind.tsx` — type cleanup
- `src/components/wellness/BreathingExercise.tsx` — guided animation
- `src/components/biashara-mind/WinsVault.tsx` — timeline enhancement
- `index.html` — CSP meta tag

**No new database migrations needed.**
**No new dependencies needed.**

