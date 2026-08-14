-- 1) Repayments: only admins or the automated (service-role) systems may record
CREATE OR REPLACE FUNCTION public.record_capital_repayment(p_advance_id uuid, p_amount numeric, p_reference text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_adv RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_adv FROM public.capital_advances WHERE id = p_advance_id;
  IF v_adv IS NULL THEN RAISE EXCEPTION 'Advance not found'; END IF;
  RETURN public.record_capital_repayment(p_advance_id, p_amount, p_reference, 'manual', NULL, NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_capital_repayment(p_advance_id uuid, p_amount numeric, p_reference text DEFAULT NULL::text, p_source text DEFAULT 'manual'::text, p_partner_id uuid DEFAULT NULL::uuid, p_checkout_request_id text DEFAULT NULL::text)
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

  -- Only admins or automated service-role callers (M-Pesa callbacks, partner
  -- webhooks, repayment cron) may record a repayment. Borrowers must never be
  -- able to credit their own advance without verified payment.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_advance FROM public.capital_advances
    WHERE id = p_advance_id FOR UPDATE;
  IF v_advance IS NULL THEN
    RAISE EXCEPTION 'Advance not found';
  END IF;

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

-- 2) Partner webhook secrets must not be readable by ordinary users
DROP POLICY IF EXISTS "capital_partners_read_active" ON public.capital_partners;

-- 3) SACCO api key hashes / contact info / notes must not be readable by ordinary users
DROP POLICY IF EXISTS "saccos_directory_read" ON public.saccos;

-- 4) Atomic wallet balance mutations (prevents concurrent double-spend)
CREATE OR REPLACE FUNCTION public.wallet_debit(p_wallet_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  UPDATE public.wallets
     SET balance = balance - p_amount,
         updated_at = now()
   WHERE id = p_wallet_id
     AND is_active = true
     AND balance >= p_amount
  RETURNING balance INTO v_balance;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance' USING ERRCODE = 'check_violation';
  END IF;
  RETURN v_balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.wallet_credit(p_wallet_id uuid, p_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  UPDATE public.wallets
     SET balance = balance + p_amount,
         updated_at = now()
   WHERE id = p_wallet_id
  RETURNING balance INTO v_balance;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  RETURN v_balance;
END;
$function$;

REVOKE ALL ON FUNCTION public.wallet_debit(uuid, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_credit(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_debit(uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.wallet_credit(uuid, numeric) TO service_role;