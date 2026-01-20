-- =============================================
-- Phase 1: Database Setup - Missing Tables
-- =============================================

-- 1.1 Wallets Table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 0 CHECK (balance >= 0),
  currency TEXT DEFAULT 'KES',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Enable RLS on wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Wallets RLS Policies
CREATE POLICY "Users can view own business wallets"
  ON public.wallets FOR SELECT
  USING (user_id = auth.uid() OR is_business_member(auth.uid(), business_id));

CREATE POLICY "Users can create own wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_business_member(auth.uid(), business_id));

CREATE POLICY "Users can update own wallet"
  ON public.wallets FOR UPDATE
  USING (user_id = auth.uid() OR is_business_owner(auth.uid(), business_id));

-- 1.2 Transactions Table
CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal', 'payment', 'refund', 'transfer');
CREATE TYPE transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'KES',
  status transaction_status DEFAULT 'pending',
  description TEXT,
  reference TEXT UNIQUE,
  payment_method TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  external_reference TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transactions RLS Policies
CREATE POLICY "Business members can view transactions"
  ON public.transactions FOR SELECT
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (is_business_member(auth.uid(), business_id));

CREATE POLICY "System can update transaction status"
  ON public.transactions FOR UPDATE
  USING (
    is_business_owner(auth.uid(), business_id) OR 
    is_admin(auth.uid()) OR
    current_setting('role', true) = 'service_role'
  );

-- 1.3 Support Tickets Table
CREATE TYPE ticket_category AS ENUM ('technical', 'billing', 'feature_request', 'bug_report', 'general');
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_response', 'resolved', 'closed');

CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category ticket_category DEFAULT 'general',
  priority ticket_priority DEFAULT 'normal',
  status ticket_status DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Enable RLS on support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Support Tickets RLS Policies
CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (user_id = auth.uid() OR assigned_to = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_business_member(auth.uid(), business_id));

CREATE POLICY "Users can update own tickets"
  ON public.support_tickets FOR UPDATE
  USING (user_id = auth.uid() OR assigned_to = auth.uid() OR is_admin(auth.uid()));

-- 1.4 FAQs Table
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on faqs
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- FAQs RLS Policies (public read for published)
CREATE POLICY "Anyone can view published FAQs"
  ON public.faqs FOR SELECT
  USING (is_published = true OR is_admin(auth.uid()) OR 
    (business_id IS NOT NULL AND is_business_owner(auth.uid(), business_id)));

CREATE POLICY "Business owners can manage FAQs"
  ON public.faqs FOR ALL
  USING (
    (business_id IS NULL AND is_admin(auth.uid())) OR
    (business_id IS NOT NULL AND is_business_owner(auth.uid(), business_id))
  );

-- 1.5 Live Chat Messages Table (for stream chat with real-time)
CREATE TABLE public.live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on live_chat_messages
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Live Chat RLS Policies
CREATE POLICY "Anyone can view chat messages for public streams"
  ON public.live_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls 
      WHERE ls.id = stream_id AND (ls.status = 'live' OR ls.user_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can send chat messages"
  ON public.live_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.live_streams ls 
      WHERE ls.id = stream_id AND ls.status = 'live'
    )
  );

CREATE POLICY "Stream owners can moderate chat"
  ON public.live_chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls 
      WHERE ls.id = stream_id AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY "Stream owners can delete chat messages"
  ON public.live_chat_messages FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.live_streams ls 
      WHERE ls.id = stream_id AND ls.user_id = auth.uid()
    )
  );

-- 1.6 Typing Indicators Table (for real-time typing)
CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS on typing_indicators
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Typing Indicators RLS Policies
CREATE POLICY "Business members can view typing indicators"
  ON public.typing_indicators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id AND is_business_member(auth.uid(), c.business_id)
    )
  );

CREATE POLICY "Users can manage own typing status"
  ON public.typing_indicators FOR ALL
  USING (user_id = auth.uid());

-- 1.7 Stream Overlays Table
CREATE TABLE public.stream_overlays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text', -- text, image, logo, ticker
  content JSONB NOT NULL DEFAULT '{}',
  position JSONB DEFAULT '{"x": 0, "y": 0}',
  size JSONB DEFAULT '{"width": 200, "height": 50}',
  is_visible BOOLEAN DEFAULT true,
  z_index INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on stream_overlays
ALTER TABLE public.stream_overlays ENABLE ROW LEVEL SECURITY;

-- Stream Overlays RLS Policies
CREATE POLICY "Users can manage own overlays"
  ON public.stream_overlays FOR ALL
  USING (user_id = auth.uid());

-- 1.8 Stream Polls Table
CREATE TABLE public.stream_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  votes JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on stream_polls
ALTER TABLE public.stream_polls ENABLE ROW LEVEL SECURITY;

-- Stream Polls RLS Policies
CREATE POLICY "Anyone can view polls for streams"
  ON public.stream_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls 
      WHERE ls.id = stream_id AND (ls.status = 'live' OR ls.user_id = auth.uid())
    )
  );

CREATE POLICY "Stream owners can create polls"
  ON public.stream_polls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.live_streams ls 
      WHERE ls.id = stream_id AND ls.user_id = auth.uid()
    )
  );

CREATE POLICY "Stream owners can update polls"
  ON public.stream_polls FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.live_streams ls 
      WHERE ls.id = stream_id AND ls.user_id = auth.uid()
    )
  );

-- 1.9 Scheduled Posts Enhancement (add more platform-specific fields)
ALTER TABLE public.scheduled_posts 
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS mentions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS link_preview JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS platform_settings JSONB DEFAULT '{}';

-- 1.10 Social Post Templates Table
CREATE TABLE public.post_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  platforms channel_type[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on post_templates
ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

-- Post Templates RLS Policies
CREATE POLICY "Business members can view templates"
  ON public.post_templates FOR SELECT
  USING (is_business_member(auth.uid(), business_id));

CREATE POLICY "Business members can manage templates"
  ON public.post_templates FOR ALL
  USING (is_business_member(auth.uid(), business_id));

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stream_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- Create updated_at triggers for new tables
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stream_overlays_updated_at
  BEFORE UPDATE ON public.stream_overlays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_post_templates_updated_at
  BEFORE UPDATE ON public.post_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_transactions_business_id ON public.transactions(business_id);
CREATE INDEX idx_transactions_wallet_id ON public.transactions(wallet_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_live_chat_messages_stream_id ON public.live_chat_messages(stream_id);
CREATE INDEX idx_typing_indicators_conversation_id ON public.typing_indicators(conversation_id);
CREATE INDEX idx_stream_polls_stream_id ON public.stream_polls(stream_id);
CREATE INDEX idx_post_templates_business_id ON public.post_templates(business_id);