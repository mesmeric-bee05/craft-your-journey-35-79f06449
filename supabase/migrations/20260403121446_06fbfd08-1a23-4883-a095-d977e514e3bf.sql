
-- Persist wellness data to database
CREATE TABLE public.wellness_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL,
  mood TEXT,
  mood_value INTEGER,
  content TEXT,
  ai_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.wellness_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wellness entries"
  ON public.wellness_entries FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger to competitors
CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
