
# Comprehensive Implementation Plan: Phases 4, 5, and 6

## Overview

This plan covers three major feature sets:
- **Phase 4**: Real-time notifications with typing indicators and enhanced message subscriptions
- **Phase 5**: Live stream editable features including stream settings editor, chat moderation, polls, and overlays
- **Phase 6**: Unified social media composer with platform-specific previews

---

## Phase 4: Real-Time Notifications Enhancement

### 4.1 Typing Indicators Hook

Create a new hook `useTypingIndicators` to manage typing status:

**File: `src/hooks/useTypingIndicators.tsx`**

- Subscribe to `typing_indicators` table changes for the active conversation
- Broadcast typing status when user is composing a message
- Auto-expire typing status after 3 seconds of inactivity
- Show "User is typing..." indicator in chat view
- Handle multiple users typing simultaneously

### 4.2 Enhanced Message Subscriptions

Update `src/hooks/useMessages.tsx`:

- Add subscription for message UPDATE events (read receipts, status changes)
- Add subscription for message DELETE events (if applicable)
- Optimistic UI updates when sending messages
- Better error handling with retry logic

### 4.3 Notification Sound File

Add a notification sound file:

**File: `public/notification.mp3`**

- Add a subtle notification sound for browser notifications
- The existing `useNotifications` hook already references this file

### 4.4 Enhanced Notification Center

Update `src/components/notifications/NotificationCenter.tsx`:

- Add desktop notification permission prompt
- Improve real-time updates
- Add notification categories/filters

### 4.5 Chat View Typing Indicator UI

Update `src/components/inbox/ChatView.tsx`:

- Display typing indicator below messages
- Show which users are currently typing
- Integrate with `useTypingIndicators` hook

### 4.6 Message Input Integration

Update `src/components/inbox/MessageInput.tsx`:

- Broadcast typing status when user is typing
- Debounce typing indicator updates (every 2 seconds)
- Clear typing status when message is sent

---

## Phase 5: Live Stream Editable Features

### 5.1 Stream Settings Editor Dialog

**File: `src/components/live/StreamSettingsDialog.tsx`**

Features:
- Edit stream title and description while live
- Toggle privacy settings (public/unlisted)
- Configure stream quality settings
- Manage chat settings (slow mode, subscribers only)
- Save settings to database in real-time

### 5.2 Real-Time Chat with Database Integration

Update `src/components/live/LiveChat.tsx`:

- Connect to `live_chat_messages` table (already created)
- Real-time message subscription using Supabase channels
- Pin important messages (moderator feature)
- Delete/ban capabilities for moderators
- Message reactions (emoji)

### 5.3 Chat Hook for Live Streaming

**File: `src/hooks/useLiveChatMessages.tsx`**

Features:
- Fetch and subscribe to live chat messages
- Send messages to database
- Pin/unpin messages
- Delete messages (moderation)
- Handle message reactions

### 5.4 Stream Polls Component

**File: `src/components/live/StreamPolls.tsx`**

Features:
- Create polls during stream (using `stream_polls` table)
- Display active polls to viewers
- Real-time vote counting
- Poll results visualization
- Close/end polls

### 5.5 Stream Polls Hook

**File: `src/hooks/useStreamPolls.tsx`**

Features:
- CRUD operations for polls
- Real-time subscription for votes
- Vote submission logic
- Poll management (activate/deactivate)

### 5.6 Stream Overlays Component

**File: `src/components/live/StreamOverlays.tsx`**

Features:
- Manage text overlays (using `stream_overlays` table)
- Drag-and-drop positioning
- Toggle overlay visibility
- Multiple overlay types (text, image, ticker)

### 5.7 Stream Overlays Hook

**File: `src/hooks/useStreamOverlays.tsx`**

Features:
- CRUD operations for overlays
- Real-time position updates
- Visibility toggles
- Z-index management

### 5.8 Chat Moderation Component

**File: `src/components/live/ChatModerator.tsx`**

Features:
- View reported messages
- Ban/timeout users
- Set slow mode duration
- Filter inappropriate content
- Moderator commands

### 5.9 Update Live Studio Page

Update `src/pages/LiveStudio.tsx`:

- Add Settings tab with StreamSettingsDialog
- Add Polls tab with StreamPolls component
- Add Overlays tab with StreamOverlays component
- Integrate moderation tools into chat

### 5.10 Update useLiveStream Hook

Update `src/hooks/useLiveStream.tsx`:

- Add `updateStream` method to edit stream details
- Add `updateStreamSettings` for real-time settings changes
- Better error handling and loading states

---

## Phase 6: Unified Social Media Composer

### 6.1 Unified Composer Component

**File: `src/components/social/UnifiedComposer.tsx`**

Features:
- Single text area with multi-platform support
- Character count per platform (TikTok: 2200, Instagram: 2200, Twitter: 280, Facebook: 63,206)
- Platform selection toggles
- AI-powered hashtag suggestions
- Emoji picker integration
- Schedule post option

### 6.2 Platform Preview Components

**File: `src/components/social/PlatformPreviews.tsx`**

Sub-components:
- `TikTokPreview` - Phone-style vertical preview
- `InstagramPreview` - Post/Story/Reel format
- `TwitterPreview` - Tweet card style
- `FacebookPreview` - Post card format
- `WhatsAppPreview` - Status/Broadcast style
- `TelegramPreview` - Channel post format

Each preview:
- Shows exactly how content will appear on that platform
- Displays character count and warnings
- Handles media differently per platform

### 6.3 Platform Config

**File: `src/components/social/platformConfig.ts`**

Configuration for each platform:
- Character limits
- Supported media types
- Aspect ratios for images/videos
- Hashtag limits
- Feature availability (stories, reels, threads, etc.)

### 6.4 Media Upload and Preview

**File: `src/components/social/MediaUploader.tsx`**

Features:
- Drag-and-drop upload
- Multi-file selection
- Image/video preview
- Aspect ratio cropping per platform
- File size validation
- Upload progress indicator

### 6.5 Hashtag Suggestions Component

**File: `src/components/social/HashtagSuggestions.tsx`**

Features:
- AI-generated hashtag suggestions based on content
- Trending hashtags per platform
- Hashtag analytics (reach estimate)
- Copy hashtag sets
- Save favorite hashtag groups

### 6.6 Content Scheduler Enhancement

**File: `src/components/social/ContentScheduler.tsx`**

Features:
- Calendar view for scheduled posts
- Best time to post suggestions (per platform)
- Recurring posts setup
- Queue management
- Timezone handling
- Bulk scheduling

### 6.7 Scheduled Posts Hook

**File: `src/hooks/useScheduledPosts.tsx`**

Features:
- CRUD operations for scheduled posts
- Filter by platform/date/status
- Bulk operations (delete, reschedule)
- Publishing status tracking

### 6.8 Social Page Integration

**File: `src/pages/Social.tsx`**

New page combining:
- Unified Composer
- Platform Previews
- Content Calendar
- Analytics Overview
- Connected Accounts

### 6.9 Post Templates

**File: `src/components/social/PostTemplates.tsx`**

Features:
- Save and reuse post templates
- Template categories
- Variable placeholders ({{product_name}}, {{price}}, etc.)
- Share templates across team

### 6.10 Update App Router

Update `src/App.tsx`:
- Add `/social` route for unified social management
- Update navigation in DashboardLayout

---

## Technical Implementation Details

### Database Tables (Already Created)

The following tables are already in place from Phase 1:
- `typing_indicators` - For real-time typing status
- `live_chat_messages` - For stream chat
- `stream_overlays` - For stream graphics
- `stream_polls` - For interactive polls
- `post_templates` - For reusable content templates

### Real-Time Subscriptions

All components will use Supabase real-time subscriptions:
```typescript
const channel = supabase
  .channel('channel-name')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'table_name',
    filter: `column=eq.value`
  }, callback)
  .subscribe()
```

### Component Architecture

```text
Phase 4: Notifications
src/
  hooks/
    useTypingIndicators.tsx (new)
    useMessages.tsx (update)
    useNotifications.tsx (update)
  components/
    inbox/
      TypingIndicator.tsx (new)
      ChatView.tsx (update)
      MessageInput.tsx (update)
    notifications/
      NotificationCenter.tsx (update)

Phase 5: Live Stream
src/
  hooks/
    useLiveChatMessages.tsx (new)
    useStreamPolls.tsx (new)
    useStreamOverlays.tsx (new)
    useLiveStream.tsx (update)
  components/
    live/
      LiveChat.tsx (update)
      StreamSettingsDialog.tsx (new)
      StreamPolls.tsx (new)
      StreamOverlays.tsx (new)
      ChatModerator.tsx (new)
  pages/
    LiveStudio.tsx (update)

Phase 6: Social Composer
src/
  hooks/
    useScheduledPosts.tsx (new)
    usePostTemplates.tsx (new)
  components/
    social/
      UnifiedComposer.tsx (new)
      PlatformPreviews.tsx (new)
      platformConfig.ts (new)
      MediaUploader.tsx (new)
      HashtagSuggestions.tsx (new)
      ContentScheduler.tsx (new)
      PostTemplates.tsx (new)
  pages/
    Social.tsx (new)
    Marketing.tsx (update)
```

---

## Implementation Order

### Step 1: Phase 4 - Real-Time Notifications (5 files)
1. Create `useTypingIndicators.tsx` hook
2. Create `TypingIndicator.tsx` component
3. Update `MessageInput.tsx` with typing broadcast
4. Update `ChatView.tsx` with typing indicator UI
5. Update `useMessages.tsx` with enhanced subscriptions

### Step 2: Phase 5 - Live Stream Features (10 files)
1. Create `useLiveChatMessages.tsx` hook
2. Update `LiveChat.tsx` with database integration
3. Create `useStreamPolls.tsx` hook
4. Create `StreamPolls.tsx` component
5. Create `useStreamOverlays.tsx` hook
6. Create `StreamOverlays.tsx` component
7. Create `StreamSettingsDialog.tsx` component
8. Create `ChatModerator.tsx` component
9. Update `useLiveStream.tsx` with edit capabilities
10. Update `LiveStudio.tsx` to integrate new features

### Step 3: Phase 6 - Social Composer (10 files)
1. Create `platformConfig.ts` with platform definitions
2. Create `useScheduledPosts.tsx` hook
3. Create `usePostTemplates.tsx` hook
4. Create `UnifiedComposer.tsx` component
5. Create `PlatformPreviews.tsx` with all platform previews
6. Create `MediaUploader.tsx` component
7. Create `HashtagSuggestions.tsx` component
8. Create `ContentScheduler.tsx` component
9. Create `PostTemplates.tsx` component
10. Create `Social.tsx` page and update routing

---

## Key Features Summary

### Phase 4 Deliverables
- Real-time typing indicators in conversations
- Enhanced message subscriptions with status updates
- Notification sounds when new messages arrive
- Better notification center with categories

### Phase 5 Deliverables
- Edit stream title/description while live
- Real-time chat with database persistence
- Interactive polls during streams
- Custom overlays and graphics
- Chat moderation tools

### Phase 6 Deliverables
- Single composer for all 6 platforms
- Platform-specific content previews
- Character count and limit warnings
- AI-powered hashtag suggestions
- Enhanced content scheduling
- Reusable post templates
