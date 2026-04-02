
CREATE TABLE public.competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website TEXT,
  social_handles JSONB DEFAULT '{}',
  industry TEXT,
  notes TEXT,
  swot JSONB DEFAULT '{"strengths":[],"weaknesses":[],"opportunities":[],"threats":[]}',
  metrics JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view competitors"
  ON public.competitors FOR SELECT
  TO authenticated
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can create competitors"
  ON public.competitors FOR INSERT
  TO authenticated
  WITH CHECK (is_business_member(auth.uid(), business_id));

CREATE POLICY "Business owners can update competitors"
  ON public.competitors FOR UPDATE
  TO authenticated
  USING (is_business_owner(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business owners can delete competitors"
  ON public.competitors FOR DELETE
  TO authenticated
  USING (is_business_owner(auth.uid(), business_id) OR is_admin(auth.uid()));
