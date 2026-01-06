-- =============================================
-- PART 1: REAL-TIME NOTIFICATIONS SYSTEM
-- =============================================

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'new_message',
  'assignment',
  'mention',
  'status_change'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_business_id ON public.notifications(business_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- System can insert notifications (via trigger with SECURITY DEFINER)
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =============================================
-- NOTIFICATION TRIGGER FOR NEW MESSAGES
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation RECORD;
  v_user_settings RECORD;
  v_customer_name TEXT;
BEGIN
  -- Only notify for customer messages
  IF NEW.sender_type = 'customer' THEN
    -- Get conversation details with customer info
    SELECT c.*, cu.name as customer_name
    INTO v_conversation 
    FROM public.conversations c
    LEFT JOIN public.customers cu ON cu.id = c.customer_id
    WHERE c.id = NEW.conversation_id;
    
    -- Notify assigned user if exists
    IF v_conversation.assigned_to IS NOT NULL THEN
      -- Check user notification settings
      SELECT * INTO v_user_settings 
      FROM public.user_settings 
      WHERE user_id = v_conversation.assigned_to;
      
      -- Default to true if no settings found
      IF v_user_settings IS NULL OR v_user_settings.notify_new_message IS TRUE THEN
        INSERT INTO public.notifications (business_id, user_id, type, title, body, data)
        VALUES (
          v_conversation.business_id,
          v_conversation.assigned_to,
          'new_message',
          'New message from ' || COALESCE(v_conversation.customer_name, 'Customer'),
          LEFT(NEW.content, 100),
          jsonb_build_object(
            'conversation_id', NEW.conversation_id, 
            'message_id', NEW.id,
            'channel_type', v_conversation.channel_type
          )
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on messages table
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

-- =============================================
-- NOTIFICATION TRIGGER FOR CONVERSATION ASSIGNMENT
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_user_settings RECORD;
  v_customer_name TEXT;
  v_assigner_name TEXT;
BEGIN
  -- Only trigger if assigned_to changed and is not null
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    -- Get customer name
    SELECT name INTO v_customer_name 
    FROM public.customers 
    WHERE id = NEW.customer_id;
    
    -- Check user notification settings
    SELECT * INTO v_user_settings 
    FROM public.user_settings 
    WHERE user_id = NEW.assigned_to;
    
    -- Default to true if no settings found
    IF v_user_settings IS NULL OR v_user_settings.notify_team_activity IS TRUE THEN
      INSERT INTO public.notifications (business_id, user_id, type, title, body, data)
      VALUES (
        NEW.business_id,
        NEW.assigned_to,
        'assignment',
        'Conversation assigned to you',
        'Conversation with ' || COALESCE(v_customer_name, 'Customer') || ' via ' || NEW.channel_type,
        jsonb_build_object(
          'conversation_id', NEW.id,
          'channel_type', NEW.channel_type,
          'previous_assignee', OLD.assigned_to
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on conversations table
CREATE TRIGGER on_conversation_assignment_notify
  AFTER UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_assignment();

-- =============================================
-- NOTIFICATION TRIGGER FOR STATUS CHANGES
-- =============================================

CREATE OR REPLACE FUNCTION public.notify_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_settings RECORD;
  v_customer_name TEXT;
BEGIN
  -- Only trigger if status changed to resolved and there's an assignee
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' AND NEW.assigned_to IS NOT NULL THEN
    -- Get customer name
    SELECT name INTO v_customer_name 
    FROM public.customers 
    WHERE id = NEW.customer_id;
    
    -- Check user notification settings
    SELECT * INTO v_user_settings 
    FROM public.user_settings 
    WHERE user_id = NEW.assigned_to;
    
    IF v_user_settings IS NULL OR v_user_settings.notify_team_activity IS TRUE THEN
      INSERT INTO public.notifications (business_id, user_id, type, title, body, data)
      VALUES (
        NEW.business_id,
        NEW.assigned_to,
        'status_change',
        'Conversation resolved',
        'Conversation with ' || COALESCE(v_customer_name, 'Customer') || ' has been resolved',
        jsonb_build_object(
          'conversation_id', NEW.id,
          'old_status', OLD.status,
          'new_status', NEW.status
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on conversations table for status changes
CREATE TRIGGER on_conversation_status_notify
  AFTER UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_status_change();