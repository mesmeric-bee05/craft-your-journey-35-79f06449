-- Phase 2: AI Marketing Suite Tables

-- Create content_type enum for AI content
CREATE TYPE public.ai_content_type AS ENUM ('caption', 'description', 'email', 'sms', 'blog', 'ad_copy', 'hashtags');

-- Create campaign_status enum
CREATE TYPE public.campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');

-- Create campaign_type enum
CREATE TYPE public.campaign_type AS ENUM ('social', 'email', 'sms', 'multi_channel');

-- Create post_status enum
CREATE TYPE public.post_status AS ENUM ('draft', 'scheduled', 'publishing', 'published', 'failed');

-- Create event_type enum
CREATE TYPE public.calendar_event_type AS ENUM ('post', 'campaign', 'reminder', 'holiday', 'custom');

-- Create ai_content table
CREATE TABLE public.ai_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type ai_content_type NOT NULL DEFAULT 'caption',
  language TEXT DEFAULT 'en',
  tone TEXT DEFAULT 'professional',
  platform TEXT,
  tokens_used INTEGER DEFAULT 0,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_used BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status campaign_status NOT NULL DEFAULT 'draft',
  type campaign_type NOT NULL DEFAULT 'social',
  target_channels channel_type[] DEFAULT '{}',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  budget DECIMAL(10, 2),
  currency TEXT DEFAULT 'KES',
  metrics JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_posts table
CREATE TABLE public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES public.social_channels(id) ON DELETE SET NULL,
  channel_type channel_type NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  status post_status NOT NULL DEFAULT 'draft',
  external_post_id TEXT,
  metrics JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type calendar_event_type NOT NULL DEFAULT 'custom',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#3B82F6',
  linked_post_id UUID REFERENCES public.scheduled_posts(id) ON DELETE SET NULL,
  linked_campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ai_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_content
CREATE POLICY "Business members can view AI content"
ON public.ai_content FOR SELECT
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can create AI content"
ON public.ai_content FOR INSERT
WITH CHECK (is_business_member(auth.uid(), business_id) OR user_id = auth.uid());

CREATE POLICY "Users can update their own AI content"
ON public.ai_content FOR UPDATE
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can delete their own AI content"
ON public.ai_content FOR DELETE
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- RLS policies for campaigns
CREATE POLICY "Business members can view campaigns"
ON public.campaigns FOR SELECT
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can manage campaigns"
ON public.campaigns FOR ALL
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

-- RLS policies for scheduled_posts
CREATE POLICY "Business members can view scheduled posts"
ON public.scheduled_posts FOR SELECT
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can manage scheduled posts"
ON public.scheduled_posts FOR ALL
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

-- RLS policies for calendar_events
CREATE POLICY "Business members can view calendar events"
ON public.calendar_events FOR SELECT
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can manage calendar events"
ON public.calendar_events FOR ALL
USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at
BEFORE UPDATE ON public.scheduled_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_ai_content_business_id ON public.ai_content(business_id);
CREATE INDEX idx_ai_content_user_id ON public.ai_content(user_id);
CREATE INDEX idx_campaigns_business_id ON public.campaigns(business_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_scheduled_posts_business_id ON public.scheduled_posts(business_id);
CREATE INDEX idx_scheduled_posts_scheduled_for ON public.scheduled_posts(scheduled_for);
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(status);
CREATE INDEX idx_calendar_events_business_id ON public.calendar_events(business_id);
CREATE INDEX idx_calendar_events_start_date ON public.calendar_events(start_date);