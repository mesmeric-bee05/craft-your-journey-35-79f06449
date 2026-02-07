
# SmartReach AI - Continued Development Plan

## Issues Identified and Fixes Required

### SLA Settings Issue - Root Cause Analysis
After thorough investigation, I've identified the SLA settings issue. The problem lies in the `useBusiness` hook which only queries businesses where the current user is the `owner_id`. This means:
1. If a user is a team member (not owner), they won't get a business and SLA policies won't load
2. The SLA Settings component depends on `business?.id` which will be null for non-owners

**Fix Required:**
- Update `useBusiness` hook to also check `business_members` table
- Ensure the query returns businesses where user is either owner OR active member

Additionally, the SLA Settings imports `useState` twice (once as `useState` and once aliased as `useStateMetrics`), which is unnecessary and could cause confusion.

---

## Phase 2 Implementation: Short-term Sprint

Based on the roadmap, Phase 1 items (Social Analytics, Post Templates, Transaction Export) are now complete. This sprint focuses on:

### 2.1 Fix SLA Settings (Critical Bug Fix)

**Changes to `src/hooks/useBusiness.tsx`:**
- Modify the query to use an OR condition that checks both owner_id and business_members
- Use a union query or join approach to find all businesses the user has access to

**Changes to `src/components/settings/SLASettings.tsx`:**
- Clean up duplicate useState import
- Add better error handling when business is null
- Show informative message if user has no business access

### 2.2 Team Management Enhancement

Create a complete team management UI in the Settings page:

**New Components:**
1. `src/components/settings/TeamSettings.tsx` - Main team management tab
2. `src/components/settings/team/TeamMembersList.tsx` - Display all members with roles
3. `src/components/settings/team/InviteMemberDialog.tsx` - Send new invitations
4. `src/components/settings/team/MemberCard.tsx` - Individual member display with actions
5. `src/components/settings/team/PendingInvitations.tsx` - Show pending invites

**Features:**
- View all team members with their roles and status
- Invite new members via email with role assignment
- Manage pending invitations (resend, revoke)
- Update member roles (admin, manager, member)
- Remove team members (deactivate)

**Updates:**
- Add Team tab to Settings.tsx
- Create useTeamInvitations hook for invitation management

### 2.3 Email Provider Integration (Resend)

**Update `supabase/functions/send-email/index.ts`:**
- Integrate with Resend API for actual email delivery
- Add proper error handling for delivery failures
- Track email delivery status

**Required Secret:**
- `RESEND_API_KEY` - User will need to provide this

**Email Templates:**
- Team invitation email
- Password reset (already handled by Supabase)
- CSAT survey email
- SLA breach notification

### 2.4 SMS Provider Integration (Africa's Talking)

**Update `supabase/functions/send-sms/index.ts`:**
- Integrate with Africa's Talking API
- Support for Kenyan phone numbers
- Delivery status callbacks

**Required Secrets:**
- `AT_API_KEY` - Africa's Talking API key
- `AT_USERNAME` - Africa's Talking username

### 2.5 Dashboard Stats Enhancement

Connect dashboard statistics to real data:

**Update `src/hooks/useDashboardStats.tsx`:**
- Fetch actual conversation counts
- Calculate real SLA compliance rates
- Get actual revenue from transactions
- Track active channel counts

---

## Technical Implementation Details

### Database Changes Required
None - all required tables already exist (team_invitations, business_members, etc.)

### File Changes Summary

**Bug Fixes:**
- `src/hooks/useBusiness.tsx` - Fix query to include business members
- `src/components/settings/SLASettings.tsx` - Clean up imports, add error state

**New Files:**
- `src/components/settings/TeamSettings.tsx`
- `src/components/settings/team/TeamMembersList.tsx`
- `src/components/settings/team/InviteMemberDialog.tsx`
- `src/components/settings/team/MemberCard.tsx`
- `src/components/settings/team/PendingInvitations.tsx`
- `src/hooks/useTeamInvitations.tsx`

**Updated Files:**
- `src/pages/Settings.tsx` - Add Team tab
- `supabase/functions/send-email/index.ts` - Resend integration
- `supabase/functions/send-sms/index.ts` - Africa's Talking integration
- `src/hooks/useDashboardStats.tsx` - Connect to real data

### Security Considerations
1. Team invitations use unique tokens that expire after 7 days
2. Only business owners can manage team members
3. Email/SMS functions already have rate limiting and authentication
4. All RLS policies are already in place for team_invitations table

### External Service Dependencies
- **Resend** (Email): Simple API, good deliverability, free tier available
- **Africa's Talking** (SMS): Best coverage for African countries, affordable rates

---

## Implementation Order

1. **SLA Fix** (Immediate) - Fix useBusiness hook and SLASettings
2. **Team Settings UI** - Complete team management experience
3. **Dashboard Stats** - Connect to real data
4. **Email Integration** - When RESEND_API_KEY is provided
5. **SMS Integration** - When AT credentials are provided

---

## Post-Implementation Testing

After implementation, test:
1. SLA Settings loads correctly for business owners
2. SLA policies can be created, edited, and deleted
3. Team members can be viewed, invited, and managed
4. Dashboard shows accurate real-time statistics
5. Email/SMS functions work with configured providers

This plan addresses the immediate SLA bug while continuing the roadmap to deliver a more complete, production-ready platform.
