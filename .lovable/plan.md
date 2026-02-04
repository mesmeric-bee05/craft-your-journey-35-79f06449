
# Comprehensive Implementation Plan: Phase 6, Security Hardening, and Agentic AI Integration

## Executive Summary

This plan addresses three major objectives:
1. **Phase 6**: Create the unified social media composer with platform-specific previews
2. **Security Hardening**: Fix all identified vulnerabilities from the security scan
3. **Document Integration**: Implement Phase 1 Agentic AI features as outlined in the SmartReach AI document

---

## Part 1: Phase 6 - Unified Social Media Composer

### 1.1 Platform Configuration File

**File: `src/components/social/platformConfig.ts`**

Define configuration for each supported platform:

```text
Platform Specifications:
+-------------+---------------+------------------+------------------+
| Platform    | Char Limit    | Media Support    | Features         |
+-------------+---------------+------------------+------------------+
| Twitter/X   | 280           | 4 images/1 video | Threads, Polls   |
| Instagram   | 2,200         | 10 images/1 video| Stories, Reels   |
| Facebook    | 63,206        | Multi-media      | Stories, Posts   |
| TikTok      | 2,200         | Video required   | Duets, Stitches  |
| WhatsApp    | 1,024         | Multi-media      | Status, Broadcast|
| Telegram    | 4,096         | Multi-media      | Channels, Bots   |
+-------------+---------------+------------------+------------------+
```

Configuration includes:
- Character limits per platform
- Supported media types and aspect ratios
- Hashtag limits
- Optimal posting times
- Platform-specific features

### 1.2 Unified Composer Component

**File: `src/components/social/UnifiedComposer.tsx`**

Features:
- Single rich text editor for all platforms
- Platform toggle switches (select which platforms to post to)
- Real-time character count per selected platform
- Warning indicators when exceeding limits
- AI-powered content suggestions integration
- Media upload with platform-specific cropping
- Hashtag input with suggestions
- Schedule or post immediately options
- Draft saving capability

### 1.3 Platform Preview Components

**File: `src/components/social/PlatformPreviews.tsx`**

Six distinct preview components that accurately simulate each platform's appearance:

- **TikTokPreview**: Phone-style vertical frame, profile picture, caption overlay
- **InstagramPreview**: Feed post format with likes, comments, profile header
- **TwitterPreview**: Tweet card with profile, engagement metrics, timestamp
- **FacebookPreview**: Post card with reactions, share options, comments
- **WhatsAppPreview**: Status/message bubble style with checkmarks
- **TelegramPreview**: Channel post format with view count

Each preview:
- Shows live content as user types
- Displays character count with warning states
- Handles media preview with platform-specific crops
- Updates in real-time

### 1.4 Media Uploader Component

**File: `src/components/social/MediaUploader.tsx`**

Features:
- Drag-and-drop file upload
- Multiple file selection
- Image/video preview grid
- Platform-specific aspect ratio guidelines
- File size validation (varies by platform)
- Upload progress indicator
- Integration with Supabase Storage

### 1.5 Hashtag Suggestions Component

**File: `src/components/social/HashtagSuggestions.tsx`**

Features:
- AI-powered hashtag generation based on content
- Trending hashtags per platform (mocked/static for now)
- One-click hashtag insertion
- Hashtag usage analytics (reach estimates)
- Save favorite hashtag sets
- Category-based suggestions

### 1.6 Scheduled Posts Hook

**File: `src/hooks/useScheduledPosts.tsx`**

CRUD operations for the existing `scheduled_posts` table:
- Create new scheduled posts
- Fetch posts by date range/status/platform
- Update post content/schedule
- Delete scheduled posts
- Real-time status updates

### 1.7 Post Templates Component

**File: `src/components/social/PostTemplates.tsx`**

Features:
- Save reusable post templates
- Template categories (product launch, promotion, announcement)
- Variable placeholders (`{{product_name}}`, `{{price}}`, etc.)
- Quick template insertion
- Template sharing across team

### 1.8 Social Page

**File: `src/pages/Social.tsx`**

New dedicated page combining:
- Unified Composer (main area)
- Platform Previews (side panel)
- Scheduled Posts Calendar
- Template Library
- Content History

Update routing in `src/App.tsx` to add `/social` route.

### 1.9 Enhanced Content Scheduler

**File: `src/components/social/ContentScheduler.tsx`**

Enhancements to existing calendar:
- Platform-specific color coding
- Best time to post suggestions (static recommendations per platform)
- Bulk scheduling operations
- Queue management (pause/resume)
- Timezone display and selection

---

## Part 2: Security Hardening

### 2.1 Critical Vulnerabilities (Priority: HIGH)

Based on the security scan, the following issues must be addressed:

#### 2.1.1 Social Media Token Exposure

**Issue**: `social_channels` table exposes OAuth tokens to business members

**Fix**: Create secure view and update RLS policies

```sql
-- Create safe view without sensitive fields
CREATE VIEW social_channels_safe AS
SELECT id, business_id, channel_type, channel_name, 
       is_connected, is_active, connected_at, metadata
FROM social_channels;

-- Update RLS to use view for regular access
-- Keep original table accessible only via security definer functions
```

The `get_channel_tokens` function already exists with proper security definer - ensure all frontend code uses this function instead of direct table access.

#### 2.1.2 Live Stream Key Exposure

**Issue**: Stream keys visible to users

**Fix**: Update RLS policies to hide sensitive fields:

```sql
-- Add column-level security via secure views
CREATE VIEW live_streams_safe AS
SELECT id, user_id, business_id, title, description, 
       status, viewer_count, peak_viewers, started_at, ended_at, 
       settings, created_at, updated_at
FROM live_streams
WHERE user_id = auth.uid();
-- Exclude: stream_key, rtmp_url
```

#### 2.1.3 Customer PII Protection

**Issue**: Customer contact info accessible to all employees

**Fix**: Implement role-based field masking:

```sql
-- Create function to mask sensitive data for non-owners
CREATE FUNCTION get_masked_customer(customer_id uuid)
RETURNS jsonb AS $$
-- Return full data for owners, masked for members
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2.1.4 Transaction Details Exposure

**Issue**: Payment details visible to all staff

**Fix**: Restrict transaction detail visibility to finance roles and transaction creator:

```sql
-- Update RLS policy for transactions
ALTER POLICY "Business members can view transactions" 
ON transactions
USING (
  user_id = auth.uid() OR 
  is_business_owner(auth.uid(), business_id) OR
  is_admin(auth.uid())
);
```

### 2.2 Medium Priority Issues

#### 2.2.1 Enable Leaked Password Protection

Use Lovable's auth configuration to enable this feature.

#### 2.2.2 Fix Message Update Policy Bug

**Issue**: Self-referential WHERE clause (`messages_1.id = messages_1.id`)

**Fix**:
```sql
-- Corrected policy
CREATE POLICY "Business members can only update message status" ON messages
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND is_business_member(auth.uid(), c.business_id)
  )
)
WITH CHECK (
  -- Ensure content is not modified
  content IS NOT DISTINCT FROM (
    SELECT m.content FROM messages m WHERE m.id = messages.id
  )
);
```

#### 2.2.3 Audit Log Policy Fix

**Issue**: INSERT policy allows any authenticated user

**Fix**:
```sql
-- Only service_role should insert audit logs
DROP POLICY IF EXISTS "Only system can insert audit logs" ON audit_logs;
CREATE POLICY "Only system can insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (
  current_setting('role', true) = 'service_role'
);
```

#### 2.2.4 SLA Tracking Access Restriction

**Fix**: Make SLA tracking read-only for business members:
```sql
-- Drop the overly permissive ALL policy
DROP POLICY "System can manage SLA tracking" ON sla_tracking;

-- Create separate SELECT and UPDATE policies
CREATE POLICY "Business members can view SLA tracking" ON sla_tracking
FOR SELECT USING (...);

CREATE POLICY "Only system can modify SLA tracking" ON sla_tracking
FOR ALL USING (
  current_setting('role', true) = 'service_role'
);
```

### 2.3 Code-Level Security Improvements

#### 2.3.1 Input Sanitization Audit

Files needing review:
- `src/hooks/useGlobalSearch.tsx` - Already uses `sanitizeSearchInput` but some queries don't use proper escaping in `.or()` clauses

**Fix**: Update all search queries to properly escape LIKE patterns:
```typescript
// Before (vulnerable)
.or(`subject.ilike.${searchPattern}`)

// After (safe)
const escapedPattern = `%${sanitizeSearchInput(query)}%`;
.or(`subject.ilike.${escapedPattern}`)
```

#### 2.3.2 dangerouslySetInnerHTML Audit

**File**: `src/components/ui/chart.tsx`

Current usage is safe (internal config, no user input) but should be documented with a security comment.

#### 2.3.3 Rate Limiting Enhancement

Current implementation uses in-memory storage which resets on function restart.

**Recommendation**: Add note in comments that production should use Redis/KV store. Current implementation is sufficient for seed stage.

---

## Part 3: Agentic AI Integration (Phase 1 - Document)

Based on the SmartReach AI document, implement Phase 1 foundational AI features:

### 3.1 AI Assistant Framework

**Approach**: "AI Assistant" mode (suggests, human approves) - not autonomous

#### 3.1.1 Enhanced AI Content Generator

Update existing `generate-content` edge function:

- Add Swahili/Sheng language support (already exists)
- Add RAG context from business product catalog
- Implement brand voice consistency
- Add content templates based on business type

#### 3.1.2 Customer Response Suggestions

Already implemented in `suggest-reply` edge function. Enhancements:

- Add product catalog context for relevant recommendations
- Improve Swahili/Sheng response quality
- Add sentiment detection for tone matching

#### 3.1.3 Smart Hashtag Generation

**File**: `src/hooks/useHashtagSuggestions.tsx`

Features:
- AI-generated hashtags based on content
- Platform-specific optimization
- Trending topic integration (mocked for Phase 1)
- Local/regional relevance (Kenya/Africa focus)

### 3.2 Basic Agent Capabilities

Implement simple rule-based automation:

#### 3.2.1 Customer Inquiry Routing

Auto-categorize incoming messages based on content:
- Product inquiries
- Support requests
- Order status
- General questions

#### 3.2.2 FAQ Automation

Use existing `faqs` table for auto-response suggestions:
- Match incoming questions to FAQ entries
- Suggest relevant FAQ answers to agents
- Track FAQ helpfulness

### 3.3 Cultural Localization

**Files to update**: Edge functions and AI prompts

- Default to Swahili/English bilingual responses when language detected
- Add Kenyan market context to all AI prompts
- Include local business etiquette guidance
- Support for M-Pesa payment references

---

## Implementation Order

### Week 1: Security Hardening (Critical)
1. Create database migration for RLS policy fixes
2. Create secure views for sensitive tables
3. Fix message update policy bug
4. Update audit log policy
5. Enable leaked password protection

### Week 2: Phase 6 - Core Components
1. Create `platformConfig.ts`
2. Create `UnifiedComposer.tsx`
3. Create `PlatformPreviews.tsx` (all 6 platforms)
4. Create `MediaUploader.tsx`

### Week 3: Phase 6 - Advanced Features
1. Create `HashtagSuggestions.tsx`
2. Create `useScheduledPosts.tsx` hook
3. Create `PostTemplates.tsx`
4. Create `ContentScheduler.tsx` enhancements

### Week 4: Integration & AI
1. Create `Social.tsx` page and update routing
2. Enhance AI content generation with localization
3. Implement smart hashtag suggestions
4. Add product catalog RAG context

---

## Files to Create

```text
src/
  components/
    social/
      platformConfig.ts          # Platform definitions
      UnifiedComposer.tsx        # Main composer component
      PlatformPreviews.tsx       # All 6 platform previews
      MediaUploader.tsx          # Media handling
      HashtagSuggestions.tsx     # AI hashtag suggestions
      ContentScheduler.tsx       # Enhanced scheduler
      PostTemplates.tsx          # Template management
  hooks/
    useScheduledPosts.tsx        # Scheduled posts hook
    useHashtagSuggestions.tsx    # AI hashtag hook
    usePostTemplates.tsx         # Templates hook
  pages/
    Social.tsx                   # Unified social page

supabase/
  migrations/
    XXXXXX_security_hardening.sql  # RLS fixes
```

## Files to Modify

```text
src/App.tsx                      # Add /social route
src/components/layout/DashboardLayout.tsx  # Add Social nav item
supabase/functions/generate-content/index.ts  # Enhanced localization
```

---

## Technical Specifications

### Database Changes (Security Migration)

```sql
-- 1. Create secure views
CREATE OR REPLACE VIEW social_channels_secure AS
SELECT id, business_id, channel_type, channel_name, 
       is_connected, is_active, connected_at, metadata, created_at, updated_at
FROM social_channels;

CREATE OR REPLACE VIEW live_streams_secure AS
SELECT id, user_id, business_id, title, description, 
       status, privacy, viewer_count, peak_viewers, 
       settings, started_at, ended_at, created_at, updated_at
FROM live_streams;

-- 2. Fix message update policy
DROP POLICY IF EXISTS "Business members can only update message status" ON messages;
CREATE POLICY "Business members can only update message status" ON messages
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (is_business_member(auth.uid(), c.business_id) OR is_admin(auth.uid()))
  )
)
WITH CHECK (
  content IS NOT DISTINCT FROM OLD.content
);

-- 3. Restrict transaction visibility
DROP POLICY IF EXISTS "Business members can view transactions" ON transactions;
CREATE POLICY "Transaction creators and owners can view full details" ON transactions
FOR SELECT USING (
  user_id = auth.uid() OR 
  is_business_owner(auth.uid(), business_id) OR 
  is_admin(auth.uid())
);

-- 4. Fix audit log insert policy
DROP POLICY IF EXISTS "Only system can insert audit logs" ON audit_logs;
CREATE POLICY "Only service role can insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (false); -- Only service_role bypasses RLS

-- 5. Restrict SLA tracking modifications
DROP POLICY IF EXISTS "System can manage SLA tracking" ON sla_tracking;
CREATE POLICY "Service role manages SLA tracking" ON sla_tracking
FOR ALL USING (
  current_setting('role', true) = 'service_role'
);
```

### API Configuration

The Social Composer will integrate with:
- Existing `generate-content` edge function for AI suggestions
- Supabase Storage for media uploads
- Real-time subscriptions for collaborative editing

### Performance Considerations

- Lazy load platform preview components
- Debounce character count calculations (300ms)
- Optimize media preview with thumbnails
- Use React Query for scheduled posts caching

---

## Success Metrics

### Phase 6 Completion
- All 6 platform previews rendering correctly
- Content scheduling working end-to-end
- Media upload functioning with Supabase Storage
- Template save/load working

### Security Hardening
- All critical vulnerabilities resolved
- Security scan shows 0 error-level findings
- RLS policies properly restrict data access

### AI Integration
- Content generation supports all 3 languages
- Hashtag suggestions generate relevant tags
- Response times under 3 seconds for AI features

---

## Risk Mitigation

### Potential Risks

1. **Platform API changes**: Using static configurations, not live API integrations
2. **AI response quality**: Using Gemini 2.5 Flash for cost-effective responses
3. **Storage limits**: Implementing file size validation before upload

### Fallback Strategies

1. Manual content customization after AI generation
2. Default to English if language detection fails
3. Graceful degradation when AI services unavailable
