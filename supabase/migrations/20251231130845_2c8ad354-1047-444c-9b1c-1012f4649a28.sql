-- Phase 1: Social Commerce Inbox Tables

-- Create message_status enum
CREATE TYPE public.message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');

-- Create conversation_status enum
CREATE TYPE public.conversation_status AS ENUM ('open', 'pending', 'resolved', 'archived');

-- Create priority enum
CREATE TYPE public.priority_level AS ENUM ('low', 'normal', 'high', 'urgent');

-- Create sender_type enum
CREATE TYPE public.sender_type AS ENUM ('customer', 'agent', 'system', 'bot');

-- Create content_type enum
CREATE TYPE public.content_type AS ENUM ('text', 'image', 'audio', 'video', 'document', 'location', 'template');

-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  external_id TEXT,
  channel_type channel_type NOT NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  first_contact_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_contact_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, channel_type, external_id)
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.social_channels(id) ON DELETE SET NULL,
  channel_type channel_type NOT NULL,
  status conversation_status NOT NULL DEFAULT 'open',
  priority priority_level NOT NULL DEFAULT 'normal',
  assigned_to UUID,
  subject TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table with realtime
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type sender_type NOT NULL,
  sender_id UUID,
  content TEXT,
  content_type content_type NOT NULL DEFAULT 'text',
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  external_id TEXT,
  status message_status NOT NULL DEFAULT 'pending',
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quick_replies table
CREATE TABLE public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- RLS policies for customers
CREATE POLICY "Business members can view customers"
ON public.customers FOR SELECT
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business owners can manage customers"
ON public.customers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = customers.business_id 
    AND businesses.owner_id = auth.uid()
  ) OR is_business_member(auth.uid(), business_id) OR is_admin(auth.uid())
);

-- RLS policies for conversations
CREATE POLICY "Business members can view conversations"
ON public.conversations FOR SELECT
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can manage conversations"
ON public.conversations FOR ALL
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

-- RLS policies for messages
CREATE POLICY "Business members can view messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (is_business_member(auth.uid(), c.business_id) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Business members can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (is_business_member(auth.uid(), c.business_id) OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Business members can update messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (is_business_member(auth.uid(), c.business_id) OR is_admin(auth.uid()))
  )
);

-- RLS policies for quick_replies
CREATE POLICY "Business members can view quick replies"
ON public.quick_replies FOR SELECT
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business owners can manage quick replies"
ON public.quick_replies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = quick_replies.business_id 
    AND businesses.owner_id = auth.uid()
  ) OR is_admin(auth.uid())
);

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quick_replies_updated_at
BEFORE UPDATE ON public.quick_replies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_customers_business_id ON public.customers(business_id);
CREATE INDEX idx_conversations_business_id ON public.conversations(business_id);
CREATE INDEX idx_conversations_customer_id ON public.conversations(customer_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_last_message_at ON public.conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_quick_replies_business_id ON public.quick_replies(business_id);