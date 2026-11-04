-- Fix: capital application tampering (owner-supplied amounts reach disbursement)
-- 1) Remove the direct owner-insert policy: applications may only be created
--    through public.apply_for_capital, which recomputes and validates the offer.
-- 2) Guard trigger: financial/identity columns on capital_applications are
--    immutable for client sessions (owners can still cancel a pending app).
-- 3) approve_capital_application recomputes the offer server-side and verifies
--    the stored amounts match before creating an advance.

-- 1) Drop the bypassable insert policy (apply_for_capital is SECURITY DEFINER
--    and runs as the table owner, so it is unaffected).
DROP POLICY IF EXISTS "capital_apps_owner_insert" ON public.capital_applications;

-- 2) Guard financial columns against direct client updates
CREATE OR REPLACE FUNCTION public.guard_capital_application_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_privileged boolean;
BEGIN
  v_privileged := session_user IN ('postgres', 'supabase_admin')
    OR coalesce(current_setting('role', true), '') = 'service_role'
    OR public.is_admin(auth.uid());

  IF NOT v_privileged THEN
    IF NEW.business_id IS DISTINCT FROM OLD.business_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.requested_amount_kes IS DISTINCT FROM OLD.requested_amount_kes
       OR NEW.revenue_share_pct IS DISTINCT FROM OLD.revenue_share_pct
       OR NEW.factor IS DISTINCT FROM OLD.factor
       OR NEW.total_repayment_kes IS DISTINCT FROM OLD.total_repayment_kes
       OR NEW.offer_snapshot IS DISTINCT FROM OLD.offer_snapshot
       OR NEW.esign_name IS DISTINCT FROM OLD.esign_name
       OR NEW.terms_accepted_at IS DISTINCT FROM OLD.terms_accepted_at THEN
      RAISE EXCEPTION 'Capital application terms can only change through the server application flow';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_capital_application_columns ON public.capital_applications;
CREATE TRIGGER guard_capital_application_columns
BEFORE UPDATE ON public.capital_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_capital_application_columns();

REVOKE ALL ON FUNCTION public.guard_capital_application_columns() FROM anon, authenticated;

-- 3) Approval recomputes and verifies the offer before releasing funds
CREATE OR REPLACE FUNCTION public.approve_capital_application(p_application_id uuid, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app RECORD;
  v_advance_id uuid;
  v_offer jsonb;
  v_fresh_max numeric;
  v_fresh_factor numeric;
  v_rs_min int;
  v_rs_max int;
  v_expected_total numeric;
  v_active_advance boolean;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_app FROM public.capital_applications WHERE id = p_application_id FOR UPDATE;
  IF v_app IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF v_app.status NOT IN ('submitted','under_review') THEN
    RAISE EXCEPTION 'Application is not pending';
  END IF;

  -- Block approval if the business already has a live advance
  SELECT EXISTS (
    SELECT 1 FROM public.capital_advances
    WHERE business_id = v_app.business_id AND status = 'active'
  ) INTO v_active_advance;
  IF v_active_advance THEN
    RAISE EXCEPTION 'Business already has an active advance';
  END IF;

  -- Recompute the offer server-side; never trust stored amounts alone
  v_offer := public.compute_capital_offer(v_app.business_id);
  IF NOT (v_offer->>'eligible')::boolean THEN
    RAISE EXCEPTION 'Business is no longer eligible: %', COALESCE(v_offer->>'reason','not eligible');
  END IF;

  v_fresh_max := (v_offer->>'max_advance_kes')::numeric;
  v_fresh_factor := (v_offer->>'factor')::numeric;
  v_rs_min := (v_offer->>'revenue_share_min_pct')::int;
  v_rs_max := (v_offer->>'revenue_share_max_pct')::int;
  v_expected_total := round(v_app.requested_amount_kes * v_fresh_factor, 2);

  IF v_app.requested_amount_kes IS NULL OR v_app.requested_amount_kes <= 0
     OR v_app.requested_amount_kes > v_fresh_max THEN
    RAISE EXCEPTION 'Application amount does not match the current offer (max %)', v_fresh_max;
  END IF;
  IF v_app.factor IS DISTINCT FROM v_fresh_factor
     OR v_app.total_repayment_kes IS DISTINCT FROM v_expected_total THEN
    RAISE EXCEPTION 'Application terms are stale or tampered. Reject it and ask the owner to re-apply.';
  END IF;
  IF v_app.revenue_share_pct IS NULL
     OR v_app.revenue_share_pct < v_rs_min OR v_app.revenue_share_pct > v_rs_max THEN
    RAISE EXCEPTION 'Application revenue share is outside the allowed range (%) to (%)', v_rs_min, v_rs_max;
  END IF;

  INSERT INTO public.capital_advances
    (application_id, business_id, principal_kes, factor, total_owed_kes,
     revenue_share_pct, status, disbursed_at)
  VALUES
    (v_app.id, v_app.business_id, v_app.requested_amount_kes, v_fresh_factor,
     v_expected_total, v_app.revenue_share_pct, 'active', now())
  RETURNING id INTO v_advance_id;

  UPDATE public.capital_applications
    SET status = 'disbursed', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_note
    WHERE id = p_application_id;

  INSERT INTO public.capital_audit (actor_user_id, business_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), v_app.business_id, 'capital.approve', 'capital_advance', v_advance_id,
          jsonb_build_object(
            'application_id', p_application_id,
            'principal_kes', v_app.requested_amount_kes,
            'verified_against_offer', true,
            'offer_max_kes', v_fresh_max,
            'offer_factor', v_fresh_factor));

  RETURN v_advance_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_capital_application(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.approve_capital_application(uuid, text) TO authenticated;
