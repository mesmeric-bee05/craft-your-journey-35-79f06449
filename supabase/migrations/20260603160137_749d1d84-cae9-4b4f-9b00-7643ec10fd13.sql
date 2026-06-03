
-- ============================================================
-- Phase 3: Bundles deep model
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_kes numeric(12,2) NOT NULL DEFAULT 0,
  is_optional boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON public.bundle_items(bundle_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundle_items TO authenticated;
GRANT ALL ON public.bundle_items TO service_role;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read bundle items"
ON public.bundle_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.bundles b
  WHERE b.id = bundle_id AND public.is_business_member(auth.uid(), b.business_id)));
CREATE POLICY "owners manage bundle items"
ON public.bundle_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.bundles b
  WHERE b.id = bundle_id AND public.is_business_owner(auth.uid(), b.business_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.bundles b
  WHERE b.id = bundle_id AND public.is_business_owner(auth.uid(), b.business_id)));

CREATE TRIGGER trg_bundle_items_updated BEFORE UPDATE ON public.bundle_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bundle interaction events
CREATE TABLE IF NOT EXISTS public.bundle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','click','add_to_cart','purchase')),
  source text,
  user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bundle_events_bundle ON public.bundle_events(bundle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bundle_events_business ON public.bundle_events(business_id, created_at DESC);
GRANT SELECT, INSERT ON public.bundle_events TO authenticated;
GRANT INSERT ON public.bundle_events TO anon;
GRANT ALL ON public.bundle_events TO service_role;
ALTER TABLE public.bundle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read bundle events"
ON public.bundle_events FOR SELECT TO authenticated
USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "anyone can log bundle views"
ON public.bundle_events FOR INSERT TO anon, authenticated
WITH CHECK (event_type IN ('view','click'));

-- Bundle suggestions (AI/co-purchase)
CREATE TABLE IF NOT EXISTS public.bundle_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  product_ids uuid[] NOT NULL,
  score numeric(6,3) NOT NULL DEFAULT 0,
  rationale text,
  source text NOT NULL DEFAULT 'co_purchase',
  is_dismissed boolean NOT NULL DEFAULT false,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bundle_suggestions_business ON public.bundle_suggestions(business_id, score DESC);
GRANT SELECT, UPDATE ON public.bundle_suggestions TO authenticated;
GRANT ALL ON public.bundle_suggestions TO service_role;
ALTER TABLE public.bundle_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read suggestions"
ON public.bundle_suggestions FOR SELECT TO authenticated
USING (public.is_business_member(auth.uid(), business_id));
CREATE POLICY "owners dismiss suggestions"
ON public.bundle_suggestions FOR UPDATE TO authenticated
USING (public.is_business_owner(auth.uid(), business_id))
WITH CHECK (public.is_business_owner(auth.uid(), business_id));

-- ============================================================
-- Phase 4: Health Score history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.business_health_score_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  overall integer NOT NULL,
  voc_component integer NOT NULL,
  inventory_component integer NOT NULL,
  engagement_component integer NOT NULL,
  growth_component integer NOT NULL,
  factors jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_health_history_business ON public.business_health_score_history(business_id, snapshot_date DESC);
GRANT SELECT ON public.business_health_score_history TO authenticated;
GRANT ALL ON public.business_health_score_history TO service_role;
ALTER TABLE public.business_health_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read health history"
ON public.business_health_score_history FOR SELECT TO authenticated
USING (public.is_business_member(auth.uid(), business_id));

-- Service-role function that snapshots all businesses (called by nightly edge fn)
CREATE OR REPLACE FUNCTION public.snapshot_all_health_scores()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer := 0;
BEGIN
  INSERT INTO public.business_health_score_history
    (business_id, snapshot_date, overall, voc_component, inventory_component, engagement_component, growth_component, factors)
  SELECT business_id, CURRENT_DATE, overall, voc_component, inventory_component, engagement_component, growth_component, factors
  FROM public.business_health_score
  ON CONFLICT (business_id, snapshot_date) DO UPDATE
    SET overall = EXCLUDED.overall,
        voc_component = EXCLUDED.voc_component,
        inventory_component = EXCLUDED.inventory_component,
        engagement_component = EXCLUDED.engagement_component,
        growth_component = EXCLUDED.growth_component,
        factors = EXCLUDED.factors;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.snapshot_all_health_scores() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_all_health_scores() TO service_role;

-- ============================================================
-- Security findings audit table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.security_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_name text NOT NULL,
  finding_internal_id text NOT NULL,
  name text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'warn',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','fixed','ignored')),
  resolution_note text,
  remediation_link text,
  commit_sha text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scanner_name, finding_internal_id, detected_at)
);
CREATE INDEX IF NOT EXISTS idx_security_findings_status ON public.security_findings(status, detected_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.security_findings TO authenticated;
GRANT ALL ON public.security_findings TO service_role;
ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read findings"
ON public.security_findings FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
CREATE POLICY "admins manage findings"
ON public.security_findings FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_security_findings_updated BEFORE UPDATE ON public.security_findings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Definer tightening — revoke anon access from sensitive RPCs
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.get_channel_tokens(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_channel_tokens(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_stream_credentials(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stream_credentials(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_customer_masked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_masked(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.compute_business_health_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compute_business_health_score(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_csat_metrics(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_csat_metrics(uuid, timestamptz, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_csat_by_channel(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_csat_by_channel(uuid, timestamptz, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_csat_by_agent(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_csat_by_agent(uuid, timestamptz, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_sla_metrics(uuid, timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sla_metrics(uuid, timestamptz, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_safe_channels(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_safe_channels(uuid) TO authenticated;

-- ============================================================
-- Avatar bucket: tighten SELECT to UUID-foldered objects only
-- ============================================================
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars readable in uuid folders"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);
