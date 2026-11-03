-- 1) business_health_score: the score is computed server-side only; owners must
--    not be able to write the score that drives Capital offers and public trust.
DROP POLICY IF EXISTS "owners manage health" ON public.business_health_score;

-- 2) contracts: only the business owner may change pay terms; recorded payments
--    (total_paid) may only change through verified processing or by an admin.
CREATE OR REPLACE FUNCTION public.guard_contract_financial_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_service boolean;
  v_admin boolean;
  v_owner boolean;
BEGIN
  v_service := coalesce(current_setting('role', true), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin');
  v_admin := v_service OR (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));
  v_owner := v_service OR (auth.uid() IS NOT NULL AND public.is_business_owner(auth.uid(), NEW.business_id));

  IF NEW.total_paid IS DISTINCT FROM OLD.total_paid AND NOT v_admin THEN
    RAISE EXCEPTION 'Contract payments can only be recorded by verified processing';
  END IF;

  IF NEW.rate IS DISTINCT FROM OLD.rate AND NOT v_owner THEN
    RAISE EXCEPTION 'Contract pay terms can only be changed by the business owner';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_contract_financial ON public.contracts;
CREATE TRIGGER trg_guard_contract_financial BEFORE UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.guard_contract_financial_columns();

-- 3) support_tickets: assigned staff must still be active business members to
--    read or update tickets assigned to them (removes access after removal).
DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (assigned_to = auth.uid() AND public.is_business_member(auth.uid(), business_id))
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own tickets" ON public.support_tickets;
CREATE POLICY "Users can update own tickets" ON public.support_tickets FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (assigned_to = auth.uid() AND public.is_business_member(auth.uid(), business_id))
    OR public.is_admin(auth.uid())
  );
