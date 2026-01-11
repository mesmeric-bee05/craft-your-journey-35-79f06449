-- ===========================================
-- CSAT Surveys Tables
-- ===========================================

-- CSAT Survey templates
CREATE TABLE public.csat_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  question TEXT NOT NULL DEFAULT 'How satisfied were you with our support?',
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  trigger_on_resolution BOOLEAN DEFAULT true,
  delay_minutes INTEGER DEFAULT 0,
  scale_type TEXT NOT NULL DEFAULT '5-star' CHECK (scale_type IN ('5-star', 'emoji', 'nps')),
  include_comment BOOLEAN DEFAULT true,
  comment_prompt TEXT DEFAULT 'Any additional feedback?',
  thank_you_message TEXT DEFAULT 'Thank you for your feedback!',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CSAT Responses
CREATE TABLE public.csat_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  survey_id UUID NOT NULL REFERENCES public.csat_surveys(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  assigned_agent_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  comment TEXT,
  channel_type public.channel_type NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.csat_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for csat_surveys
CREATE POLICY "Business members can view CSAT surveys"
  ON public.csat_surveys FOR SELECT
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "Business owners can manage CSAT surveys"
  ON public.csat_surveys FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = business_id AND owner_id = auth.uid()
  ));

-- RLS Policies for csat_responses
CREATE POLICY "Business members can view CSAT responses"
  ON public.csat_responses FOR SELECT
  USING (public.is_business_member(auth.uid(), business_id));

CREATE POLICY "System can insert CSAT responses"
  ON public.csat_responses FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_csat_surveys_business ON public.csat_surveys(business_id);
CREATE INDEX idx_csat_surveys_active ON public.csat_surveys(business_id, is_active);
CREATE INDEX idx_csat_responses_business ON public.csat_responses(business_id);
CREATE INDEX idx_csat_responses_survey ON public.csat_responses(survey_id);
CREATE INDEX idx_csat_responses_conversation ON public.csat_responses(conversation_id);
CREATE INDEX idx_csat_responses_agent ON public.csat_responses(assigned_agent_id);
CREATE INDEX idx_csat_responses_date ON public.csat_responses(business_id, responded_at);

-- Updated_at trigger
CREATE TRIGGER update_csat_surveys_updated_at
  BEFORE UPDATE ON public.csat_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- CSAT Analytics Functions
-- ===========================================

CREATE OR REPLACE FUNCTION public.get_csat_metrics(
  p_business_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_responses BIGINT,
  avg_rating NUMERIC,
  nps_score NUMERIC,
  rating_1_count BIGINT,
  rating_2_count BIGINT,
  rating_3_count BIGINT,
  rating_4_count BIGINT,
  rating_5_count BIGINT,
  response_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_resolved BIGINT;
BEGIN
  -- Count total resolved conversations in period
  SELECT COUNT(*) INTO v_total_resolved
  FROM sla_tracking st
  JOIN conversations c ON c.id = st.conversation_id
  WHERE c.business_id = p_business_id
  AND st.resolved_at BETWEEN p_start_date AND p_end_date;

  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_responses,
    ROUND(AVG(r.rating)::NUMERIC, 2) as avg_rating,
    -- NPS calculation (for 5-star: 5 = promoter, 3-4 = passive, 1-2 = detractor)
    ROUND(
      (COUNT(*) FILTER (WHERE r.rating >= 5)::NUMERIC - COUNT(*) FILTER (WHERE r.rating <= 2)::NUMERIC) 
      / NULLIF(COUNT(*), 0) * 100,
      1
    ) as nps_score,
    COUNT(*) FILTER (WHERE r.rating = 1)::BIGINT as rating_1_count,
    COUNT(*) FILTER (WHERE r.rating = 2)::BIGINT as rating_2_count,
    COUNT(*) FILTER (WHERE r.rating = 3)::BIGINT as rating_3_count,
    COUNT(*) FILTER (WHERE r.rating = 4)::BIGINT as rating_4_count,
    COUNT(*) FILTER (WHERE r.rating = 5)::BIGINT as rating_5_count,
    ROUND(
      COUNT(*)::NUMERIC / NULLIF(v_total_resolved, 0) * 100,
      1
    ) as response_rate
  FROM csat_responses r
  WHERE r.business_id = p_business_id
  AND r.responded_at BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Get CSAT metrics by agent
CREATE OR REPLACE FUNCTION public.get_csat_by_agent(
  p_business_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  agent_id UUID,
  agent_name TEXT,
  total_responses BIGINT,
  avg_rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.assigned_agent_id,
    COALESCE(p.full_name, 'Unassigned') as agent_name,
    COUNT(*)::BIGINT as total_responses,
    ROUND(AVG(r.rating)::NUMERIC, 2) as avg_rating
  FROM csat_responses r
  LEFT JOIN profiles p ON p.user_id = r.assigned_agent_id
  WHERE r.business_id = p_business_id
  AND r.responded_at BETWEEN p_start_date AND p_end_date
  GROUP BY r.assigned_agent_id, p.full_name
  ORDER BY avg_rating DESC;
END;
$$;

-- Get CSAT metrics by channel
CREATE OR REPLACE FUNCTION public.get_csat_by_channel(
  p_business_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  channel_type public.channel_type,
  total_responses BIGINT,
  avg_rating NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.channel_type,
    COUNT(*)::BIGINT as total_responses,
    ROUND(AVG(r.rating)::NUMERIC, 2) as avg_rating
  FROM csat_responses r
  WHERE r.business_id = p_business_id
  AND r.responded_at BETWEEN p_start_date AND p_end_date
  GROUP BY r.channel_type
  ORDER BY avg_rating DESC;
END;
$$;