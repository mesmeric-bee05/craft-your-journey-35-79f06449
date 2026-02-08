
# SmartReach AI - Comprehensive Development & SLA Fix Plan

## Issue Analysis: SLA Settings Blank Page

### Root Cause Identified

After thorough investigation of the codebase, I've identified **multiple potential causes** for the SLA Settings blank page:

1. **Missing `finally` block in `useBusiness` hook fetch logic**: The `useBusiness.tsx` hook has a critical bug where the `setLoading(false)` is inside the `finally` block, but the function returns early for owned businesses without reaching `finally`:

   ```typescript
   if (ownedBusiness) {
     setBusiness(ownedBusiness as Business);
     return; // ← Returns here, finally block still executes BUT...
   }
   ```

   The issue is that when looking up member businesses, if there's an error in the second query, the loading state might not update properly.

2. **The `useBusiness` hook is called TWICE** - once in `SLASettings.tsx` directly, and again inside `useSLAPolicies.tsx`. This creates two separate hook instances that may have race conditions or conflicting state.

3. **The `useSLAPolicies` hook depends on `useBusiness`** which creates a cascading dependency where `loading` states compound - if `useBusiness` takes time to resolve, the SLA component shows skeleton loading, but if business becomes null, the "No Business Found" card should show.

### Evidence from Code Analysis

Looking at `SLASettings.tsx` lines 54-69:
```typescript
if (loading || businessLoading) {
  return <Skeleton ... />
}

if (!business) {
  return <Card>"No Business Found"</Card>
}
```

The blank page occurs when:
- Both `loading` and `businessLoading` are `false` 
- BUT `business` is `null`
- AND somehow the component returns nothing or crashes silently

The actual issue is likely a **React rendering edge case** or an **error in the SLASettings component** that's being swallowed.

---

## Fixes Required

### Fix 1: Consolidate `useBusiness` usage in SLA hooks

The `SLASettings` component should NOT call `useBusiness()` directly. Instead, `useSLAPolicies` should expose the business state, avoiding double-hook invocation.

### Fix 2: Add Error Boundary to SLASettings

Wrap SLASettings in an error boundary to catch silent failures.

### Fix 3: Defensive null checks in SLASettings

The component assumes `metrics` has certain properties but checks for `null` incorrectly:
```typescript
{metrics?.first_response_compliance_rate !== null 
```
This should check for `undefined` as well since `metrics` itself might be null.

### Fix 4: Improve `useBusiness` hook stability

Add explicit error state handling and ensure loading always resolves correctly.

---

## Phase 2 Continued Development

### 2.1 Fix SLA Settings Component

**File: `src/components/settings/SLASettings.tsx`**
- Remove direct `useBusiness()` call
- Get business from `useSLAPolicies` hook (modify hook to expose it)
- Add proper null/undefined checks
- Add error state display

**File: `src/hooks/useSLAPolicies.tsx`**
- Expose `business` and `businessLoading` from the hook
- Ensure proper loading state synchronization

**File: `src/hooks/useBusiness.tsx`**
- Add more robust error handling
- Ensure `finally` block always executes loading state update
- Add `hasError` state for better debugging

### 2.2 Email Provider Integration (Resend)

**File: `supabase/functions/send-email/index.ts`**
- Replace placeholder with actual Resend API integration
- Add email templates for:
  - Team invitations
  - CSAT survey requests
  - SLA breach notifications
  - Password reset (already handled by Supabase, but custom template)

**Required Secret**: `RESEND_API_KEY`

### 2.3 SMS Provider Integration (Africa's Talking)

**File: `supabase/functions/send-sms/index.ts`**
- Replace placeholder with Africa's Talking API integration
- Add support for:
  - Single SMS
  - Bulk SMS campaigns
  - Delivery status callbacks

**Required Secrets**: `AT_API_KEY`, `AT_USERNAME`

### 2.4 M-Pesa Payment Integration

**New Files:**
- `supabase/functions/mpesa-stk-push/index.ts` - Initiate STK Push payments
- `supabase/functions/mpesa-callback/index.ts` - Handle payment callbacks

**Required Secrets**: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`

### 2.5 Complete Campaign Automation Foundation

**Database Migrations:**
- Add `automation_workflows` table
- Add `workflow_steps` table
- Add `workflow_executions` table

**New Components:**
- `src/components/marketing/CampaignAutomation.tsx`
- `src/components/marketing/WorkflowBuilder.tsx`

### 2.6 Customer Segmentation

**Database Migrations:**
- Add `customer_segments` table
- Add `segment_rules` JSONB column

**New Components:**
- `src/components/customers/CustomerSegments.tsx`
- `src/components/customers/SegmentBuilder.tsx`

---

## Technical Implementation Details

### Database Changes

| Table | Purpose |
|-------|---------|
| `automation_workflows` | Store campaign automation flows |
| `workflow_steps` | Individual steps in a workflow |
| `workflow_executions` | Track workflow execution history |
| `customer_segments` | Dynamic customer groupings |

### New Edge Functions

| Function | Purpose |
|----------|---------|
| `mpesa-stk-push` | Initiate M-Pesa payments |
| `mpesa-callback` | Handle M-Pesa payment confirmations |
| `execute-workflow` | Run automation workflows |
| `send-bulk-sms` | Campaign SMS delivery |

### File Changes Summary

**Bug Fixes:**
1. `src/hooks/useBusiness.tsx` - Improve stability and error handling
2. `src/hooks/useSLAPolicies.tsx` - Expose business state
3. `src/components/settings/SLASettings.tsx` - Fix blank page issue

**Enhancements:**
4. `supabase/functions/send-email/index.ts` - Resend integration
5. `supabase/functions/send-sms/index.ts` - Africa's Talking integration

**New Files:**
6. `supabase/functions/mpesa-stk-push/index.ts`
7. `supabase/functions/mpesa-callback/index.ts`
8. Campaign automation components
9. Customer segmentation components

---

## Security Considerations

1. **API Keys Storage**: All external API keys stored as Supabase secrets
2. **RLS Policies**: Already in place for new tables
3. **Rate Limiting**: Already implemented in edge functions
4. **Input Validation**: Using Zod schemas in edge functions
5. **Webhook Security**: Add signature verification for M-Pesa callbacks

---

## Implementation Priority

| Order | Task | Criticality |
|-------|------|-------------|
| 1 | Fix SLA Settings blank page | CRITICAL - User-facing bug |
| 2 | Stabilize useBusiness hook | HIGH - Affects multiple features |
| 3 | Email integration (Resend) | MEDIUM - Enables team invites |
| 4 | SMS integration (Africa's Talking) | MEDIUM - Core functionality |
| 5 | M-Pesa integration | HIGH - Revenue critical |
| 6 | Campaign automation | LOW - Phase 3 feature |
| 7 | Customer segmentation | LOW - Phase 3 feature |

---

## Testing Checklist

After implementation:
- [ ] SLA Settings loads correctly for business owners
- [ ] SLA Settings shows "No Business" message for users without business
- [ ] SLA policies can be created, edited, deleted
- [ ] Team invitations send emails (when Resend configured)
- [ ] SMS messages send successfully (when AT configured)
- [ ] M-Pesa payments initiate and complete (when configured)
- [ ] Dashboard stats show real-time data
- [ ] All settings tabs render without errors
