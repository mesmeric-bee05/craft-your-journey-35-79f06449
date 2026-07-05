
-- =========================================================================
-- SMARTREACH CAPITAL — revenue-based financing
-- =========================================================================

-- ENUMS
DO $$ BEGIN CREATE TYPE public.capital_application_status AS ENUM
  ('submitted','under_review','approved','rejected','disbursed','repaid','defaulted','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.capital_advance_status AS ENUM ('active','repaid','defaulted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.capital_repayment_source AS ENUM ('auto_mpesa','manual','partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.capital_repayment_status AS ENUM ('pending','paid','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.capital_partner_kind AS ENUM ('sacco','bank','internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================================
-- 1. capital_partners
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.capital_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind public.capital_partner_kind NOT NULL DEFAULT 'internal',
  webhook_url text,
  webhook_secret_hash text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.capital_partners TO authenticated;
GRANT ALL ON public.capital_partners TO service_role;
ALTER TABLE public.capital_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capital_partners_admin_all" ON public.capital_partners
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "capital_partners_read_active" ON public.capital_partners
  FOR SELECT TO authenticated
  USING (is_active = true);
CREATE TRIGGER trg_capital_partners_updated
  BEFORE UPDATE ON public.capital_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 2. capital_offers  (one row per business, upserted by compute_capital_offer)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.capital_offers (
  business_id uuid PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  eligible boolean NOT NULL DEFAULT false,
  score integer,
  monthly_gmv_kes numeric(14,2) DEFAULT 0,
  business_age_days integer DEFAULT 0,
  max_advance_kes numeric(14,2) DEFAULT 0,
  factor numeric(4,2),
  revenue_share_min_pct integer,
  revenue_share_max_pct integer,
  reason text,
  factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.capital_offers TO authenticated;
GRANT ALL ON public.capital_offers TO service_role;
ALTER TABLE public.capital_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capital_offers_admin_all" ON public.capital_offers
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "capital_offers_business_read" ON public.capital_offers
  FOR SELECT TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

CREATE TRIGGER trg_capital_offers_updated
  BEFORE UPDATE ON public.capital_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. capital_applications
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.capital_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  requested_amount_kes numeric(14,2) NOT NULL,
  revenue_share_pct integer NOT NULL,
  factor numeric(4,2) NOT NULL,
  total_repayment_kes numeric(14,2) NOT NULL,
  status public.capital_application_status NOT NULL DEFAULT 'submitted',
  offer_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  terms_accepted_at timestamptz,
  esign_name text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  partner_id uuid REFERENCES public.capital_partners(id) ON DELETE SET NULL,
  partner_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capital_apps_business ON public.capital_applications(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capital_apps_status ON public.capital_applications(status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.capital_applications TO authenticated;
GRANT ALL ON public.capital_applications TO service_role;
ALTER TABLE public.capital_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capital_apps_admin_all" ON public.capital_applications
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "capital_apps_owner_read" ON public.capital_applications
  FOR SELECT TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

CREATE POLICY "capital_apps_owner_insert" ON public.capital_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_business_owner(auth.uid(), business_id)
    AND user_id = auth.uid()
    AND status = 'submitted'
  );

CREATE POLICY "capital_apps_owner_cancel" ON public.capital_applications
  FOR UPDATE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id) AND status IN ('submitted','under_review'))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id) AND status = 'cancelled');

CREATE TRIGGER trg_capital_apps_updated
  BEFORE UPDATE ON public.capital_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 4. capital_advances
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.capital_advances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid UNIQUE NOT NULL REFERENCES public.capital_applications(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  principal_kes numeric(14,2) NOT NULL,
  factor numeric(4,2) NOT NULL,
  total_owed_kes numeric(14,2) NOT NULL,
  amount_repaid_kes numeric(14,2) NOT NULL DEFAULT 0,
  revenue_share_pct integer NOT NULL,
  status public.capital_advance_status NOT NULL DEFAULT 'active',
  mpesa_disbursement_ref text,
  disbursed_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capital_advances_business ON public.capital_advances(business_id, status);

GRANT SELECT, INSERT, UPDATE ON public.capital_advances TO authenticated;
GRANT ALL ON public.capital_advances TO service_role;
ALTER TABLE public.capital_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capital_advances_admin_all" ON public.capital_advances
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "capital_advances_owner_read" ON public.capital_advances
  FOR SELECT TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

CREATE TRIGGER trg_capital_advances_updated
  BEFORE UPDATE ON public.capital_advances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 5. capital_repayments
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.capital_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id uuid NOT NULL REFERENCES public.capital_advances(id) ON DELETE CASCADE,
  amount_kes numeric(14,2) NOT NULL,
  source public.capital_repayment_source NOT NULL DEFAULT 'manual',
  mpesa_reference text,
  status public.capital_repayment_status NOT NULL DEFAULT 'pending',
  scheduled_for date DEFAULT CURRENT_DATE,
  collected_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capital_repayments_advance ON public.capital_repayments(advance_id, scheduled_for DESC);

GRANT SELECT, INSERT ON public.capital_repayments TO authenticated;
GRANT ALL ON public.capital_repayments TO service_role;
ALTER TABLE public.capital_repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capital_repayments_admin_all" ON public.capital_repayments
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "capital_repayments_owner_read" ON public.capital_repayments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.capital_advances a
    WHERE a.id = advance_id AND public.is_business_owner(auth.uid(), a.business_id)
  ));

CREATE TRIGGER trg_capital_repayments_updated
  BEFORE UPDATE ON public.capital_repayments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 6. capital_audit
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.capital_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capital_audit_business ON public.capital_audit(business_id, created_at DESC);

GRANT SELECT, INSERT ON public.capital_audit TO authenticated;
GRANT ALL ON public.capital_audit TO service_role;
ALTER TABLE public.capital_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capital_audit_admin_read" ON public.capital_audit
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "capital_audit_business_read" ON public.capital_audit
  FOR SELECT TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

-- =========================================================================
-- ELIGIBILITY ENGINE
-- =========================================================================
CREATE OR REPLACE FUNCTION public.compute_capital_offer(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer;
  v_gmv_30 numeric := 0;
  v_gmv_90 numeric := 0;
  v_age_days integer;
  v_max_advance numeric := 0;
  v_factor numeric;
  v_rs_min int; v_rs_max int;
  v_eligible boolean := false;
  v_reason text := NULL;
BEGIN
  IF NOT public.is_business_member(auth.uid(), p_business_id) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT overall INTO v_score FROM public.business_health_score WHERE business_id = p_business_id;
  v_score := COALESCE(v_score, 0);

  SELECT EXTRACT(DAY FROM now() - created_at)::int INTO v_age_days
    FROM public.businesses WHERE id = p_business_id;
  v_age_days := COALESCE(v_age_days, 0);

  BEGIN
    SELECT COALESCE(SUM(amount),0) INTO v_gmv_30
      FROM public.transactions
      WHERE business_id = p_business_id
        AND payment_method = 'mpesa' AND type = 'income' AND status = 'completed'
        AND created_at > now() - interval '30 days';
    SELECT COALESCE(SUM(amount),0) INTO v_gmv_90
      FROM public.transactions
      WHERE business_id = p_business_id
        AND payment_method = 'mpesa' AND type = 'income' AND status = 'completed'
        AND created_at > now() - interval '90 days';
  EXCEPTION WHEN OTHERS THEN
    v_gmv_30 := 0; v_gmv_90 := 0;
  END;

  IF v_age_days < 90 THEN
    v_reason := 'Business must be trading for at least 90 days.';
  ELSIF v_score < 40 THEN
    v_reason := 'SmartReach Score too low. Reach at least 40 by improving customer sentiment and engagement.';
  ELSIF v_gmv_30 < 5000 THEN
    v_reason := 'Not enough verified M-Pesa income in the last 30 days.';
  ELSE
    v_eligible := true;
    IF v_score >= 80 THEN v_factor := 1.10; v_rs_min := 5;  v_rs_max := 10;
    ELSIF v_score >= 60 THEN v_factor := 1.15; v_rs_min := 8;  v_rs_max := 15;
    ELSE v_factor := 1.20; v_rs_min := 12; v_rs_max := 20;
    END IF;
    v_max_advance := LEAST(v_gmv_30 * 3, 500000);
    -- round down to nearest 500
    v_max_advance := floor(v_max_advance / 500) * 500;
  END IF;

  INSERT INTO public.capital_offers
    (business_id, eligible, score, monthly_gmv_kes, business_age_days,
     max_advance_kes, factor, revenue_share_min_pct, revenue_share_max_pct,
     reason, factors, computed_at)
  VALUES
    (p_business_id, v_eligible, v_score, v_gmv_30, v_age_days,
     v_max_advance, v_factor, v_rs_min, v_rs_max, v_reason,
     jsonb_build_object('gmv_30d', v_gmv_30, 'gmv_90d', v_gmv_90, 'score', v_score, 'age_days', v_age_days),
     now())
  ON CONFLICT (business_id) DO UPDATE SET
    eligible = EXCLUDED.eligible,
    score = EXCLUDED.score,
    monthly_gmv_kes = EXCLUDED.monthly_gmv_kes,
    business_age_days = EXCLUDED.business_age_days,
    max_advance_kes = EXCLUDED.max_advance_kes,
    factor = EXCLUDED.factor,
    revenue_share_min_pct = EXCLUDED.revenue_share_min_pct,
    revenue_share_max_pct = EXCLUDED.revenue_share_max_pct,
    reason = EXCLUDED.reason,
    factors = EXCLUDED.factors,
    computed_at = now();

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'score', v_score,
    'monthly_gmv_kes', v_gmv_30,
    'business_age_days', v_age_days,
    'max_advance_kes', v_max_advance,
    'factor', v_factor,
    'revenue_share_min_pct', v_rs_min,
    'revenue_share_max_pct', v_rs_max,
    'reason', v_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.compute_capital_offer(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.compute_capital_offer(uuid) TO authenticated;

-- =========================================================================
-- APPLY FOR CAPITAL
-- =========================================================================
CREATE OR REPLACE FUNCTION public.apply_for_capital(
  p_business_id uuid,
  p_requested_amount numeric,
  p_revenue_share_pct integer,
  p_esign_name text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer jsonb;
  v_max numeric;
  v_factor numeric;
  v_rs_min int; v_rs_max int;
  v_app_id uuid;
  v_active_advance boolean;
BEGIN
  IF NOT public.is_business_owner(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'Only the business owner may apply' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Recompute offer to get fresh numbers
  v_offer := public.compute_capital_offer(p_business_id);

  IF NOT (v_offer->>'eligible')::boolean THEN
    RAISE EXCEPTION 'Not eligible: %', COALESCE(v_offer->>'reason','not eligible');
  END IF;

  v_max := (v_offer->>'max_advance_kes')::numeric;
  v_factor := (v_offer->>'factor')::numeric;
  v_rs_min := (v_offer->>'revenue_share_min_pct')::int;
  v_rs_max := (v_offer->>'revenue_share_max_pct')::int;

  IF p_requested_amount <= 0 OR p_requested_amount > v_max THEN
    RAISE EXCEPTION 'Requested amount must be between 1 and %', v_max;
  END IF;
  IF p_revenue_share_pct < v_rs_min OR p_revenue_share_pct > v_rs_max THEN
    RAISE EXCEPTION 'Revenue share must be between %%% and %%%', v_rs_min, v_rs_max;
  END IF;
  IF length(coalesce(p_esign_name,'')) < 2 THEN
    RAISE EXCEPTION 'Please type your full name to sign';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.capital_advances WHERE business_id = p_business_id AND status = 'active')
    INTO v_active_advance;
  IF v_active_advance THEN
    RAISE EXCEPTION 'You already have an active advance. Repay it before applying again.';
  END IF;

  INSERT INTO public.capital_applications
    (business_id, user_id, requested_amount_kes, revenue_share_pct, factor,
     total_repayment_kes, status, offer_snapshot, terms_accepted_at, esign_name)
  VALUES
    (p_business_id, auth.uid(), p_requested_amount, p_revenue_share_pct, v_factor,
     round(p_requested_amount * v_factor, 2), 'submitted', v_offer, now(), p_esign_name)
  RETURNING id INTO v_app_id;

  INSERT INTO public.capital_audit (actor_user_id, business_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), p_business_id, 'capital.apply', 'capital_application', v_app_id,
          jsonb_build_object('requested_amount_kes', p_requested_amount, 'revenue_share_pct', p_revenue_share_pct));

  RETURN v_app_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_for_capital(uuid, numeric, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_for_capital(uuid, numeric, integer, text) TO authenticated;

-- =========================================================================
-- APPROVE / REJECT
-- =========================================================================
CREATE OR REPLACE FUNCTION public.approve_capital_application(p_application_id uuid, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_advance_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_app FROM public.capital_applications WHERE id = p_application_id FOR UPDATE;
  IF v_app IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF v_app.status NOT IN ('submitted','under_review') THEN
    RAISE EXCEPTION 'Application is not pending';
  END IF;

  INSERT INTO public.capital_advances
    (application_id, business_id, principal_kes, factor, total_owed_kes,
     revenue_share_pct, status, disbursed_at)
  VALUES
    (v_app.id, v_app.business_id, v_app.requested_amount_kes, v_app.factor,
     v_app.total_repayment_kes, v_app.revenue_share_pct, 'active', now())
  RETURNING id INTO v_advance_id;

  UPDATE public.capital_applications
    SET status = 'disbursed', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
    WHERE id = p_application_id;

  INSERT INTO public.capital_audit (actor_user_id, business_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), v_app.business_id, 'capital.approve', 'capital_advance', v_advance_id,
          jsonb_build_object('application_id', p_application_id, 'principal_kes', v_app.requested_amount_kes));

  RETURN v_advance_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_capital_application(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_capital_application(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_capital_application(p_application_id uuid, p_note text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_app RECORD;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_app FROM public.capital_applications WHERE id = p_application_id FOR UPDATE;
  IF v_app IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF v_app.status NOT IN ('submitted','under_review') THEN
    RAISE EXCEPTION 'Application is not pending';
  END IF;
  UPDATE public.capital_applications
    SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
    WHERE id = p_application_id;
  INSERT INTO public.capital_audit (actor_user_id, business_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), v_app.business_id, 'capital.reject', 'capital_application', p_application_id,
          jsonb_build_object('note', p_note));
END;
$$;

REVOKE ALL ON FUNCTION public.reject_capital_application(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.reject_capital_application(uuid, text) TO authenticated;

-- =========================================================================
-- RECORD MANUAL REPAYMENT
-- =========================================================================
CREATE OR REPLACE FUNCTION public.record_capital_repayment(
  p_advance_id uuid,
  p_amount numeric,
  p_reference text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adv RECORD;
  v_new_repaid numeric;
  v_repayment_id uuid;
BEGIN
  SELECT * INTO v_adv FROM public.capital_advances WHERE id = p_advance_id FOR UPDATE;
  IF v_adv IS NULL THEN RAISE EXCEPTION 'Advance not found'; END IF;
  IF NOT public.is_admin(auth.uid())
     AND NOT public.is_business_owner(auth.uid(), v_adv.business_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  INSERT INTO public.capital_repayments (advance_id, amount_kes, source, mpesa_reference, status, collected_at)
  VALUES (p_advance_id, p_amount, 'manual', p_reference, 'paid', now())
  RETURNING id INTO v_repayment_id;

  v_new_repaid := v_adv.amount_repaid_kes + p_amount;
  UPDATE public.capital_advances
    SET amount_repaid_kes = v_new_repaid,
        status = CASE WHEN v_new_repaid >= v_adv.total_owed_kes THEN 'repaid' ELSE 'active' END,
        closed_at = CASE WHEN v_new_repaid >= v_adv.total_owed_kes THEN now() ELSE closed_at END
    WHERE id = p_advance_id;

  INSERT INTO public.capital_audit (actor_user_id, business_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), v_adv.business_id, 'capital.repayment', 'capital_repayment', v_repayment_id,
          jsonb_build_object('amount_kes', p_amount, 'reference', p_reference));

  RETURN v_repayment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_capital_repayment(uuid, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.record_capital_repayment(uuid, numeric, text) TO authenticated;
