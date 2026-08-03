-- 1. Webhook event dedupe
ALTER TABLE public.capital_webhook_events
  ADD COLUMN IF NOT EXISTS dedupe_key text;

CREATE UNIQUE INDEX IF NOT EXISTS ux_capital_webhook_events_dedupe
  ON public.capital_webhook_events (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- 2. Repayment idempotency constraints (clean duplicates first)
DELETE FROM public.capital_repayments r
USING public.capital_repayments k
WHERE r.checkout_request_id IS NOT NULL
  AND r.checkout_request_id = k.checkout_request_id
  AND r.advance_id = k.advance_id
  AND r.ctid > k.ctid;

DELETE FROM public.capital_repayments r
USING public.capital_repayments k
WHERE r.partner_id IS NOT NULL
  AND r.mpesa_reference IS NOT NULL
  AND r.partner_id = k.partner_id
  AND r.mpesa_reference = k.mpesa_reference
  AND r.advance_id = k.advance_id
  AND r.ctid > k.ctid;

CREATE UNIQUE INDEX IF NOT EXISTS ux_capital_repayments_checkout
  ON public.capital_repayments (advance_id, checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_capital_repayments_partner_ref
  ON public.capital_repayments (advance_id, partner_id, mpesa_reference)
  WHERE partner_id IS NOT NULL AND mpesa_reference IS NOT NULL;

-- 3. Idempotent repayment recording
CREATE OR REPLACE FUNCTION public.record_capital_repayment(
  p_advance_id uuid,
  p_amount numeric,
  p_reference text DEFAULT NULL::text,
  p_source text DEFAULT 'manual'::text,
  p_partner_id uuid DEFAULT NULL::uuid,
  p_checkout_request_id text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  IF auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid())
     AND NOT public.is_business_owner(auth.uid(), v_advance.business_id) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Idempotency: same M-Pesa checkout id, or same partner reference
  IF p_checkout_request_id IS NOT NULL THEN
    SELECT id INTO v_rep_id FROM public.capital_repayments
     WHERE advance_id = p_advance_id
       AND checkout_request_id = p_checkout_request_id
     LIMIT 1;
  ELSIF p_partner_id IS NOT NULL AND p_reference IS NOT NULL THEN
    SELECT id INTO v_rep_id FROM public.capital_repayments
     WHERE advance_id = p_advance_id
       AND partner_id = p_partner_id
       AND mpesa_reference = p_reference
     LIMIT 1;
  END IF;

  IF v_rep_id IS NOT NULL THEN
    RETURN v_rep_id;
  END IF;

  INSERT INTO public.capital_repayments
    (advance_id, amount_kes, source, mpesa_reference, status, collected_at,
     partner_id, checkout_request_id)
  VALUES
    (p_advance_id, p_amount, p_source::capital_repayment_source, p_reference, 'paid',
     now(), p_partner_id, p_checkout_request_id)
  RETURNING id INTO v_rep_id;

  -- Recompute from full history rather than incrementing
  SELECT COALESCE(SUM(amount_kes), 0) INTO v_new_repaid
    FROM public.capital_repayments
   WHERE advance_id = p_advance_id AND status = 'paid';

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
                               'reference', p_reference, 'partner_id', p_partner_id,
                               'checkout_request_id', p_checkout_request_id));

  RETURN v_rep_id;
END;
$function$;

-- 4. Owner-facing advance status (no partner/admin fields exposed)
CREATE OR REPLACE FUNCTION public.get_my_advance_status(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_adv RECORD;
  v_app RECORD;
  v_last_sync timestamptz;
  v_repayments jsonb;
BEGIN
  IF auth.uid() IS NULL
     OR NOT (public.is_business_owner(auth.uid(), p_business_id) OR public.is_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_adv FROM public.capital_advances
   WHERE business_id = p_business_id
   ORDER BY created_at DESC LIMIT 1;

  SELECT * INTO v_app FROM public.capital_applications
   WHERE business_id = p_business_id
   ORDER BY created_at DESC LIMIT 1;

  IF v_adv IS NULL AND v_app IS NULL THEN
    RETURN jsonb_build_object('has_activity', false);
  END IF;

  IF v_adv IS NOT NULL THEN
    SELECT max(greatest(coalesce(processed_at, created_at), created_at)) INTO v_last_sync
      FROM public.capital_webhook_events WHERE advance_id = v_adv.id;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id', id, 'amount_kes', amount_kes, 'source', source,
             'status', status, 'scheduled_for', scheduled_for,
             'collected_at', collected_at, 'reference', mpesa_reference
           ) ORDER BY created_at DESC), '[]'::jsonb)
      INTO v_repayments
      FROM public.capital_repayments WHERE advance_id = v_adv.id;
  END IF;

  RETURN jsonb_build_object(
    'has_activity', true,
    'application', CASE WHEN v_app IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_app.id,
      'status', v_app.status,
      'requested_amount_kes', v_app.requested_amount_kes,
      'revenue_share_pct', v_app.revenue_share_pct,
      'review_note', v_app.review_note,
      'created_at', v_app.created_at
    ) END,
    'advance', CASE WHEN v_adv IS NULL THEN NULL ELSE jsonb_build_object(
      'id', v_adv.id,
      'principal_kes', v_adv.principal_kes,
      'total_owed_kes', v_adv.total_owed_kes,
      'amount_repaid_kes', v_adv.amount_repaid_kes,
      'revenue_share_pct', v_adv.revenue_share_pct,
      'status', v_adv.status,
      'disbursement_status', v_adv.disbursement_status,
      'disbursement_error', v_adv.disbursement_error,
      'disbursement_requested_at', v_adv.disbursement_requested_at,
      'mpesa_disbursement_ref', v_adv.mpesa_disbursement_ref,
      'disbursed_at', v_adv.disbursed_at,
      'closed_at', v_adv.closed_at
    ) END,
    'repayments', coalesce(v_repayments, '[]'::jsonb),
    'last_synced_at', v_last_sync
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_my_advance_status(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_advance_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_advance_status(uuid) TO service_role;