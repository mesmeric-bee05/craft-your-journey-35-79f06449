-- 1) Guard wallet financial columns against direct client updates
CREATE OR REPLACE FUNCTION public.guard_wallet_financial_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_privileged boolean;
BEGIN
  v_privileged := coalesce(current_setting('app.wallet_ledger', true), '') = 'on'
    OR coalesce(current_setting('role', true), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin');

  IF NOT v_privileged THEN
    IF NEW.balance IS DISTINCT FROM OLD.balance
       OR NEW.currency IS DISTINCT FROM OLD.currency THEN
      RAISE EXCEPTION 'Wallet balance and currency can only change through the transaction ledger';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_wallet_financial_columns ON public.wallets;
CREATE TRIGGER guard_wallet_financial_columns
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.guard_wallet_financial_columns();

-- ledger functions flag themselves as privileged
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
  PERFORM set_config('app.wallet_ledger', 'on', true);
  UPDATE public.wallets
     SET balance = balance + p_amount,
         updated_at = now()
   WHERE id = p_wallet_id
  RETURNING balance INTO v_balance;
  PERFORM set_config('app.wallet_ledger', 'off', true);
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  RETURN v_balance;
END;
$function$;

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
  PERFORM set_config('app.wallet_ledger', 'on', true);
  UPDATE public.wallets
     SET balance = balance - p_amount,
         updated_at = now()
   WHERE id = p_wallet_id
     AND is_active = true
     AND balance >= p_amount
  RETURNING balance INTO v_balance;
  PERFORM set_config('app.wallet_ledger', 'off', true);
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance' USING ERRCODE = 'check_violation';
  END IF;
  RETURN v_balance;
END;
$function$;

-- 2) Guard transaction financial columns / status transitions
CREATE OR REPLACE FUNCTION public.guard_transaction_financial_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_privileged boolean;
BEGIN
  v_privileged := coalesce(current_setting('role', true), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin')
    OR (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

  IF NOT v_privileged THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.external_reference IS DISTINCT FROM OLD.external_reference
       OR NEW.business_id IS DISTINCT FROM OLD.business_id
       OR NEW.wallet_id IS DISTINCT FROM OLD.wallet_id THEN
      RAISE EXCEPTION 'Transaction amount and status can only be changed by verified payment processing';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_transaction_financial_columns ON public.transactions;
CREATE TRIGGER guard_transaction_financial_columns
BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.guard_transaction_financial_columns();

-- tighten the update policy so it always has an explicit WITH CHECK
DROP POLICY IF EXISTS "System can update transaction status" ON public.transactions;
CREATE POLICY "Owners and admins can update non-financial transaction fields"
ON public.transactions
FOR UPDATE
TO authenticated
USING (is_business_owner(auth.uid(), business_id) OR is_admin(auth.uid()))
WITH CHECK (is_business_owner(auth.uid(), business_id) OR is_admin(auth.uid()));