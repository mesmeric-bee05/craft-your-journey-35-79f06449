-- ============ Sentiment logs ============
CREATE TABLE public.customer_sentiment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversation_id uuid,
  message_id uuid,
  customer_id uuid,
  source text NOT NULL DEFAULT 'inbox', -- inbox | csat | public_form | manual
  sentiment text NOT NULL CHECK (sentiment IN ('positive','neutral','negative')),
  score numeric(3,2) NOT NULL CHECK (score >= -1 AND score <= 1),
  themes text[] NOT NULL DEFAULT '{}',
  language text NOT NULL DEFAULT 'en' CHECK (language IN ('en','sw','sheng','mixed')),
  raw_text text,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_csl_business_date ON public.customer_sentiment_log(business_id, analyzed_at DESC);
CREATE INDEX idx_csl_sentiment ON public.customer_sentiment_log(business_id, sentiment);
CREATE INDEX idx_csl_themes ON public.customer_sentiment_log USING GIN(themes);

ALTER TABLE public.customer_sentiment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read sentiment"
  ON public.customer_sentiment_log FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.is_admin(auth.uid()));

-- writes: service role only (no policy = denied for non-service-role)

-- ============ Daily rollup ============
CREATE TABLE public.business_sentiment_daily (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  date date NOT NULL,
  total int NOT NULL DEFAULT 0,
  positive int NOT NULL DEFAULT 0,
  neutral int NOT NULL DEFAULT 0,
  negative int NOT NULL DEFAULT 0,
  avg_score numeric(3,2),
  top_themes jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, date)
);

ALTER TABLE public.business_sentiment_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read daily rollup"
  ON public.business_sentiment_daily FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.is_admin(auth.uid()));

-- ============ Feedback forms ============
CREATE TABLE public.feedback_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  require_contact boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ff_business ON public.feedback_forms(business_id);

ALTER TABLE public.feedback_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own forms"
  ON public.feedback_forms FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Public read active forms by slug"
  ON public.feedback_forms FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Owners create forms"
  ON public.feedback_forms FOR INSERT TO authenticated
  WITH CHECK (public.is_business_owner(auth.uid(), business_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Owners update forms"
  ON public.feedback_forms FOR UPDATE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Owners delete forms"
  ON public.feedback_forms FOR DELETE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_ff_updated BEFORE UPDATE ON public.feedback_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Feedback submissions ============
CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  form_id uuid REFERENCES public.feedback_forms(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'public_form' CHECK (source IN ('public_form','manual','inbox','csat')),
  customer_name text,
  customer_email text,
  customer_phone text,
  rating int CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','spam')),
  moderated_by uuid,
  moderated_at timestamptz,
  submitted_by uuid, -- if a logged-in agent entered manually
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fs_business_status ON public.feedback_submissions(business_id, status, created_at DESC);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read submissions"
  ON public.feedback_submissions FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Members moderate submissions"
  ON public.feedback_submissions FOR UPDATE TO authenticated
  USING (public.is_business_member(auth.uid(), business_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Members manual insert"
  ON public.feedback_submissions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_member(auth.uid(), business_id)
    AND submitted_by = auth.uid()
    AND source IN ('manual','inbox')
  );

-- Validation trigger: anonymous inserts only allowed when form is active and matches business
CREATE OR REPLACE FUNCTION public.validate_public_feedback_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form RECORD;
BEGIN
  -- Only validate anonymous public submissions
  IF auth.uid() IS NULL THEN
    IF NEW.source <> 'public_form' OR NEW.form_id IS NULL THEN
      RAISE EXCEPTION 'Anonymous submissions must use a public form';
    END IF;
    SELECT * INTO v_form FROM public.feedback_forms WHERE id = NEW.form_id;
    IF v_form IS NULL OR NOT v_form.is_active OR v_form.business_id <> NEW.business_id THEN
      RAISE EXCEPTION 'Form is not active';
    END IF;
    IF length(coalesce(NEW.message,'')) < 3 OR length(NEW.message) > 4000 THEN
      RAISE EXCEPTION 'Message length invalid';
    END IF;
    -- Force pending status & clear privileged fields
    NEW.status := 'pending';
    NEW.submitted_by := NULL;
    NEW.moderated_by := NULL;
    NEW.moderated_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fs_validate BEFORE INSERT ON public.feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION public.validate_public_feedback_submission();

CREATE POLICY "Public insert via active form"
  ON public.feedback_submissions FOR INSERT TO anon
  WITH CHECK (
    source = 'public_form'
    AND form_id IS NOT NULL
    AND status = 'pending'
  );

CREATE TRIGGER trg_fs_updated BEFORE UPDATE ON public.feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Slug availability helper ============
CREATE OR REPLACE FUNCTION public.is_feedback_slug_available(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.feedback_forms WHERE slug = lower(p_slug));
$$;