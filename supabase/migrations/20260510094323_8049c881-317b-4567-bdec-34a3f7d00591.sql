
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.geo_entity_type AS ENUM ('competitor','supplier','customer_cluster','event','landmark');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.geo_entity_source AS ENUM ('manual','google_places','csv');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ business_locations ============
CREATE TABLE public.business_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  lat numeric(9,6) NOT NULL,
  lng numeric(9,6) NOT NULL,
  geo_label text,
  service_radius_km numeric(5,2) NOT NULL DEFAULT 5,
  is_primary boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_business_locations_business ON public.business_locations(business_id);
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read locations" ON public.business_locations FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "owners manage locations" ON public.business_locations FOR ALL TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));
CREATE TRIGGER trg_business_locations_updated BEFORE UPDATE ON public.business_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ geo_entities ============
CREATE TABLE public.geo_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  entity_type public.geo_entity_type NOT NULL,
  name text NOT NULL,
  lat numeric(9,6) NOT NULL,
  lng numeric(9,6) NOT NULL,
  geo_label text,
  source public.geo_entity_source NOT NULL DEFAULT 'manual',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_geo_entities_business_type ON public.geo_entities(business_id, entity_type);
CREATE INDEX idx_geo_entities_label ON public.geo_entities(business_id, geo_label);
ALTER TABLE public.geo_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read entities" ON public.geo_entities FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "owners manage entities" ON public.geo_entities FOR ALL TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));
CREATE TRIGGER trg_geo_entities_updated BEFORE UPDATE ON public.geo_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ geo_insights_daily ============
CREATE TABLE public.geo_insights_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  date date NOT NULL,
  geo_label text NOT NULL,
  customer_count integer NOT NULL DEFAULT 0,
  avg_sentiment numeric(4,3),
  competitor_density integer NOT NULL DEFAULT 0,
  opportunity_score integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, date, geo_label)
);
CREATE INDEX idx_geo_insights_business_date ON public.geo_insights_daily(business_id, date DESC);
ALTER TABLE public.geo_insights_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read insights" ON public.geo_insights_daily FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "owners manage insights" ON public.geo_insights_daily FOR ALL TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

-- ============ business_public_profiles ============
CREATE TABLE public.business_public_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  tagline text,
  hero_image_url text,
  is_published boolean NOT NULL DEFAULT false,
  show_health_score boolean NOT NULL DEFAULT true,
  show_voc_highlights boolean NOT NULL DEFAULT true,
  show_bundles boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]{3,40}$')
);
ALTER TABLE public.business_public_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read profile" ON public.business_public_profiles FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "owners manage profile" ON public.business_public_profiles FOR ALL TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));
CREATE TRIGGER trg_public_profile_updated BEFORE UPDATE ON public.business_public_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ bundles ============
CREATE TABLE public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_kes numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_on_profile boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bundles_business ON public.bundles(business_id);
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read bundles" ON public.bundles FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "owners manage bundles" ON public.bundles FOR ALL TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));
CREATE TRIGGER trg_bundles_updated BEFORE UPDATE ON public.bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ business_health_score ============
CREATE TABLE public.business_health_score (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  overall integer NOT NULL DEFAULT 0,
  voc_component integer NOT NULL DEFAULT 0,
  inventory_component integer NOT NULL DEFAULT 0,
  engagement_component integer NOT NULL DEFAULT 0,
  growth_component integer NOT NULL DEFAULT 0,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.business_health_score ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read health" ON public.business_health_score FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "owners manage health" ON public.business_health_score FOR ALL TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

-- ============ feedback_moderation_rules ============
CREATE TABLE public.feedback_moderation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  spam_keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  block_languages text[] NOT NULL DEFAULT ARRAY[]::text[],
  min_message_length integer NOT NULL DEFAULT 5,
  max_links integer NOT NULL DEFAULT 2,
  auto_reject_below_score numeric(3,2),
  auto_approve_above_score numeric(3,2),
  severity_threshold text NOT NULL DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.feedback_moderation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read rules" ON public.feedback_moderation_rules FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "owners manage rules" ON public.feedback_moderation_rules FOR ALL TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));
CREATE TRIGGER trg_mod_rules_updated BEFORE UPDATE ON public.feedback_moderation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ feedback_moderation_log ============
CREATE TABLE public.feedback_moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  submission_id uuid NOT NULL REFERENCES public.feedback_submissions(id) ON DELETE CASCADE,
  decision text NOT NULL,
  rule_fired text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  acted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_mod_log_business ON public.feedback_moderation_log(business_id, created_at DESC);
CREATE INDEX idx_mod_log_submission ON public.feedback_moderation_log(submission_id);
ALTER TABLE public.feedback_moderation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read mod log" ON public.feedback_moderation_log FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

-- ============ Extend sentiment tables ============
ALTER TABLE public.customer_sentiment_log
  ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS geo_label text;

ALTER TABLE public.business_sentiment_daily
  ADD COLUMN IF NOT EXISTS top_keywords jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============ FUNCTIONS ============

CREATE OR REPLACE FUNCTION public.is_business_slug_available(p_slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.business_public_profiles WHERE slug = lower(p_slug));
$$;

CREATE OR REPLACE FUNCTION public.get_public_business_profile(p_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile RECORD;
  v_business RECORD;
  v_health RECORD;
  v_location RECORD;
  v_bundles jsonb;
  v_voc jsonb;
BEGIN
  SELECT * INTO v_profile FROM public.business_public_profiles
    WHERE slug = lower(p_slug) AND is_published = true;
  IF v_profile IS NULL THEN RETURN NULL; END IF;

  SELECT id, name, logo_url, industry INTO v_business
    FROM public.businesses WHERE id = v_profile.business_id;

  SELECT overall, voc_component, inventory_component, engagement_component, growth_component, factors, computed_at
    INTO v_health FROM public.business_health_score WHERE business_id = v_profile.business_id;

  SELECT name, lat, lng, geo_label, service_radius_km INTO v_location
    FROM public.business_locations
    WHERE business_id = v_profile.business_id AND is_primary = true LIMIT 1;

  IF v_profile.show_bundles THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'description', description,
      'items', items, 'price_kes', price_kes
    )), '[]'::jsonb)
    INTO v_bundles FROM public.bundles
    WHERE business_id = v_profile.business_id AND is_active = true AND display_on_profile = true;
  ELSE
    v_bundles := '[]'::jsonb;
  END IF;

  IF v_profile.show_voc_highlights THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'rating', rating, 'message', LEFT(message, 280),
      'name', COALESCE(NULLIF(SPLIT_PART(COALESCE(customer_name,''), ' ', 1), ''), 'Mteja'),
      'created_at', created_at
    )), '[]'::jsonb)
    INTO v_voc FROM (
      SELECT * FROM public.feedback_submissions
      WHERE business_id = v_profile.business_id AND status = 'approved'
      ORDER BY created_at DESC LIMIT 6
    ) s;
  ELSE
    v_voc := '[]'::jsonb;
  END IF;

  -- bump view count (best-effort)
  UPDATE public.business_public_profiles SET view_count = view_count + 1 WHERE id = v_profile.id;

  RETURN jsonb_build_object(
    'slug', v_profile.slug,
    'tagline', v_profile.tagline,
    'hero_image_url', v_profile.hero_image_url,
    'business', jsonb_build_object('name', v_business.name, 'logo_url', v_business.logo_url, 'industry', v_business.industry),
    'location', CASE WHEN v_location IS NULL THEN NULL ELSE jsonb_build_object(
      'name', v_location.name, 'lat', v_location.lat, 'lng', v_location.lng,
      'geo_label', v_location.geo_label, 'service_radius_km', v_location.service_radius_km
    ) END,
    'health', CASE WHEN v_health IS NULL OR NOT v_profile.show_health_score THEN NULL ELSE jsonb_build_object(
      'overall', v_health.overall,
      'components', jsonb_build_object(
        'voc', v_health.voc_component, 'inventory', v_health.inventory_component,
        'engagement', v_health.engagement_component, 'growth', v_health.growth_component
      ),
      'factors', v_health.factors,
      'computed_at', v_health.computed_at
    ) END,
    'bundles', v_bundles,
    'voc_highlights', v_voc
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_business_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_slug_available(text) TO authenticated;

-- compute_business_health_score
CREATE OR REPLACE FUNCTION public.compute_business_health_score(p_business_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_voc int := 50; v_inv int := 50; v_eng int := 50; v_grw int := 50;
  v_overall int;
  v_avg_sent numeric;
  v_low_stock int;
  v_total_products int;
  v_recent_msgs int;
  v_resolved_rate numeric;
  v_factors jsonb;
BEGIN
  IF NOT public.is_business_member(auth.uid(), p_business_id) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE='insufficient_privilege';
  END IF;

  SELECT AVG(score) INTO v_avg_sent FROM public.customer_sentiment_log
    WHERE business_id = p_business_id AND analyzed_at > now() - interval '30 days';
  IF v_avg_sent IS NOT NULL THEN
    v_voc := GREATEST(0, LEAST(100, ROUND(((v_avg_sent + 1) / 2.0) * 100)::int));
  END IF;

  BEGIN
    SELECT COUNT(*) FILTER (WHERE current_stock <= COALESCE(reorder_level,0)),
           COUNT(*) INTO v_low_stock, v_total_products
    FROM public.products WHERE business_id = p_business_id AND is_active = true;
    IF v_total_products > 0 THEN
      v_inv := GREATEST(0, 100 - ROUND((v_low_stock::numeric / v_total_products) * 100)::int);
    END IF;
  EXCEPTION WHEN undefined_table THEN v_inv := 50; END;

  SELECT COUNT(*) INTO v_recent_msgs FROM public.messages m
    JOIN public.conversations c ON c.id = m.conversation_id
    WHERE c.business_id = p_business_id AND m.created_at > now() - interval '7 days';
  v_eng := LEAST(100, v_recent_msgs);

  SELECT (COUNT(*) FILTER (WHERE status='resolved'))::numeric / NULLIF(COUNT(*),0)
    INTO v_resolved_rate FROM public.conversations
    WHERE business_id = p_business_id AND created_at > now() - interval '30 days';
  IF v_resolved_rate IS NOT NULL THEN
    v_grw := ROUND(v_resolved_rate * 100)::int;
  END IF;

  v_overall := ROUND(0.35*v_voc + 0.25*v_eng + 0.25*v_inv + 0.15*v_grw)::int;
  v_factors := jsonb_build_object(
    'voc_avg_sentiment', v_avg_sent,
    'low_stock_items', v_low_stock,
    'total_products', v_total_products,
    'msgs_last_7d', v_recent_msgs,
    'resolved_rate_30d', v_resolved_rate
  );

  INSERT INTO public.business_health_score(business_id, overall, voc_component, inventory_component, engagement_component, growth_component, factors, computed_at)
  VALUES (p_business_id, v_overall, v_voc, v_inv, v_eng, v_grw, v_factors, now())
  ON CONFLICT (business_id) DO UPDATE
    SET overall=EXCLUDED.overall, voc_component=EXCLUDED.voc_component,
        inventory_component=EXCLUDED.inventory_component, engagement_component=EXCLUDED.engagement_component,
        growth_component=EXCLUDED.growth_component, factors=EXCLUDED.factors, computed_at=now();

  RETURN jsonb_build_object(
    'overall', v_overall, 'voc', v_voc, 'inventory', v_inv,
    'engagement', v_eng, 'growth', v_grw, 'factors', v_factors
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.compute_business_health_score(uuid) TO authenticated;

-- ============ Moderation trigger ============
CREATE OR REPLACE FUNCTION public.apply_feedback_moderation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rules RECORD;
  v_link_count int;
  v_kw text;
  v_decision text := NEW.status;
  v_rule text;
BEGIN
  -- Only run for anonymous public submissions
  IF auth.uid() IS NOT NULL OR NEW.source <> 'public_form' THEN RETURN NEW; END IF;

  SELECT * INTO v_rules FROM public.feedback_moderation_rules
    WHERE business_id = NEW.business_id AND is_active = true;
  IF v_rules IS NULL THEN RETURN NEW; END IF;

  -- min length
  IF length(coalesce(NEW.message,'')) < v_rules.min_message_length THEN
    NEW.status := 'spam'; v_decision := 'spam'; v_rule := 'min_length';
  END IF;

  -- link count
  IF v_rule IS NULL THEN
    v_link_count := COALESCE(array_length(regexp_split_to_array(NEW.message, 'https?://'), 1) - 1, 0);
    IF v_link_count > v_rules.max_links THEN
      NEW.status := 'spam'; v_decision := 'spam'; v_rule := 'max_links';
    END IF;
  END IF;

  -- spam keywords
  IF v_rule IS NULL AND array_length(v_rules.spam_keywords,1) > 0 THEN
    FOREACH v_kw IN ARRAY v_rules.spam_keywords LOOP
      IF position(lower(v_kw) IN lower(NEW.message)) > 0 THEN
        NEW.status := 'spam'; v_decision := 'spam'; v_rule := 'spam_keyword:' || v_kw;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.feedback_moderation_log(business_id, submission_id, decision, rule_fired, details)
  VALUES (NEW.business_id, NEW.id, v_decision, v_rule,
    jsonb_build_object('source', NEW.source, 'length', length(coalesce(NEW.message,''))));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_feedback_moderation ON public.feedback_submissions;
CREATE TRIGGER trg_apply_feedback_moderation
  BEFORE INSERT ON public.feedback_submissions
  FOR EACH ROW EXECUTE FUNCTION public.apply_feedback_moderation();
