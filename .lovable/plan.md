

## Plan: Security Hardening, Feature Completion, and Full-Stack Polish

### Security Findings (Critical)

The security scan reveals **4 critical/warning findings**:
1. `profiles_safe`, `customers_safe`, `transactions_safe`, `live_streams_safe` views have **zero RLS policies** -- any authenticated user can read all data across all businesses
2. Leaked password protection is disabled (dashboard-only fix, noted for user)

These views are **not used anywhere in application code** (only auto-generated types reference them). The safest fix is to **drop all 4 views entirely**, eliminating the attack surface.

### Implementation Plan

#### 1. Drop Unsafe Views (Database Migration)

Execute a migration to drop all 4 `*_safe` views. They were created with the intent of masking PII, but since no frontend code references them, they serve no purpose and only expose data. The existing `get_customer_masked()` RPC function already handles PII masking properly.

```sql
DROP VIEW IF EXISTS public.profiles_safe;
DROP VIEW IF EXISTS public.customers_safe;
DROP VIEW IF EXISTS public.transactions_safe;
DROP VIEW IF EXISTS public.live_streams_safe;
```

#### 2. Notification Sound System

Create `src/hooks/useNotificationSound.tsx` -- play `notification.mp3` (already exists in `/public`) when new notifications arrive. Integrate with the existing `useNotifications` hook using a ref to track previous count. Respect the `notification_sound` user setting from `user_settings`.

Wire into `NotificationCenter.tsx`.

#### 3. Dark Mode Toggle

The project uses `next-themes` but has no toggle in the UI. Add a theme toggle button to the `DashboardLayout.tsx` header (between search and notifications). Use a `Sun`/`Moon` icon button that cycles through light/dark/system. Wrap the app with `ThemeProvider` in `App.tsx`.

#### 4. Inbox: Real-time Message Notifications with Sound

Enhance `ChatView.tsx` to play the notification sound when a new customer message arrives while viewing a different conversation. This uses the existing Supabase realtime subscription on the `messages` table.

#### 5. Landing Page CTA and Footer Polish

Update `Index.tsx`:
- Add a proper footer with company info, ODPC compliance badge, social links, and "Built for Africa" messaging
- Ensure all CTA buttons link to `/auth` for signup

---

### Technical Details

**Files to create:**
- `src/hooks/useNotificationSound.tsx`

**Files to modify:**
- `src/App.tsx` -- wrap with `ThemeProvider` from `next-themes`
- `src/components/layout/DashboardLayout.tsx` -- add theme toggle button in header
- `src/components/notifications/NotificationCenter.tsx` -- integrate notification sound
- `src/pages/Index.tsx` -- add footer section

**Database migration:**
- Drop 4 unsafe views (profiles_safe, customers_safe, transactions_safe, live_streams_safe)

**No new dependencies needed** -- `next-themes` is already installed.

