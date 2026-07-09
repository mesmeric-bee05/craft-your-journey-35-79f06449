
-- 1. capital_advances: disbursement lifecycle
ALTER TABLE public.capital_advances
  ADD COLUMN IF NOT EXISTS disbursement_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS disbursed_msisdn text,
  ADD COLUMN IF NOT EXISTS disbursement_error text,
  ADD COLUMN IF NOT EXISTS disbursement_requested_at timestamptz;

-- 2. capital_repayments: STK matching + partner attribution
ALTER TABLE public.capital_repayments
  ADD COLUMN IF NOT EXISTS checkout_request_id text,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.capital_partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_capital_repayments_checkout
  ON public.capital_repayments(checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

-- 3. capital_partners: last event tracking
ALTER TABLE public.capital_partners
  ADD COLUMN IF NOT EXISTS last_event_at timestamptz;

-- 4. capital_audit: index on entity_id for timeline queries
CREATE INDEX IF NOT EXISTS idx_capital_audit_entity
  ON public.capital_audit(entity_id, created_at DESC);

-- 5. get_capital_audit: admin-visible timeline for an application (joins profile safely)
CREATE OR REPLACE FUNCTION public.get_capital_audit(p_application_id uuid)
RETURNS TABLE (
  id uuid,
  action text,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz,
  actor_user_id uuid,
  actor_name text,
  actor_email text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
BEGIN
  SELECT business_id INTO v_business_id
    FROM public.capital_applications WHERE id = p_application_id;
  IF v_business_id IS NULL THEN RETURN; END IF;

  IF NOT public.is_admin(auth.uid())
     AND NOT public.is_business_owner(auth.uid(), v_business_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
    SELECT a.id, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at,
           a.actor_user_id, p.full_name, p.email
      FROM public.capital_audit a
      LEFT JOIN public.profiles p ON p.user_id = a.actor_user_id
     WHERE a.entity_id = p_application_id
        OR a.business_id = v_business_id
     ORDER BY a.created_at DESC
     LIMIT 200;
END;
$$;

-- 6. rotate_capital_partner_secret: admin-only; returns plaintext once, stores hash
CREATE OR REPLACE FUNCTION public.rotate_capital_partner_secret(p_partner_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plain text;
  v_hash text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  v_plain := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_plain, 'sha256'), 'hex');

  UPDATE public.capital_partners
     SET webhook_secret_hash = v_hash, updated_at = now()
   WHERE id = p_partner_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partner not found';
  END IF;

  INSERT INTO public.capital_audit (actor_user_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), 'capital.partner.rotate_secret', 'capital_partner', p_partner_id, '{}'::jsonb);

  RETURN v_plain;
END;
$$;

-- 7. record_capital_repayment: admin or system, atomic balance update
CREATE OR REPLACE FUNCTION public.record_capital_repayment(
  p_advance_id uuid,
  p_amount numeric,
  p_reference text DEFAULT NULL,
  p_source text DEFAULT 'manual',
  p_partner_id uuid DEFAULT NULL,
  p_checkout_request_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_advance RECORD;
  v_rep_id uuid;
  v_new_repaid numeric;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT * INTO v_advance FROM public.capital_advances
    WHERE id = p_advance_id FOR UPDATE;
  IF v_advance IS NULL THEN
    RAISE EXCEPTION 'Advance not found';
  END IF;

  -- Authorization: admin, business owner, or system (auth.uid() null in edge fn w/ service role)
  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid())
     AND NOT public.is_business_owner(auth.uid(), v_advance.business_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.capital_repayments
    (advance_id, amount_kes, source, mpesa_reference, status, collected_at,
     partner_id, checkout_request_id)
  VALUES
    (p_advance_id, p_amount, p_source::capital_repayment_source, p_reference, 'paid',
     now(), p_partner_id, p_checkout_request_id)
  RETURNING id INTO v_rep_id;

  v_new_repaid := COALESCE(v_advance.amount_repaid_kes, 0) + p_amount;

  UPDATE public.capital_advances
     SET amount_repaid_kes = v_new_repaid,
         status = CASE WHEN v_new_repaid >= total_owed_kes THEN 'repaid'::capital_advance_status
                       ELSE status END,
         closed_at = CASE WHEN v_new_repaid >= total_owed_kes THEN now() ELSE closed_at END,
         updated_at = now()
   WHERE id = p_advance_id;

  INSERT INTO public.capital_audit (actor_user_id, business_id, action, entity_type, entity_id, metadata)
    VALUES (auth.uid(), v_advance.business_id, 'capital.repayment.record',
            'capital_repayment', v_rep_id,
            jsonb_build_object('amount_kes', p_amount, 'source', p_source,
                               'reference', p_reference, 'partner_id', p_partner_id));

  RETURN v_rep_id;
END;
$$;

-- 8. Enrich reject_capital_application audit metadata
CREATE OR REPLACE FUNCTION public.reject_capital_application(p_application_id uuid, p_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
          jsonb_build_object(
            'note', p_note,
            'requested_amount_kes', v_app.requested_amount_kes,
            'revenue_share_pct', v_app.revenue_share_pct,
            'factor', v_app.factor
          ));
END;
$$;

-- pgcrypto for digest/gen_random_bytes (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

GRANT EXECUTE ON FUNCTION public.get_capital_audit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_capital_partner_secret(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_capital_repayment(uuid, numeric, text, text, uuid, text) TO authenticated, service_role;
