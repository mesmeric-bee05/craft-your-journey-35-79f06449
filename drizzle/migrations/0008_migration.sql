CREATE OR REPLACE FUNCTION public.guard_wallet_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT (coalesce(current_setting('app.wallet_ledger', true), '') = 'on'
     OR coalesce(current_setting('role', true), '') = 'service_role'
     OR session_user IN ('postgres','supabase_admin')) THEN
    NEW.balance := 0;
    NEW.currency := 'KES';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_wallet_insert ON public.wallets;
CREATE TRIGGER guard_wallet_insert BEFORE INSERT ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.guard_wallet_insert();

CREATE OR REPLACE FUNCTION public.guard_customer_external_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF coalesce(current_setting('role', true), '') = 'service_role'
     OR session_user IN ('postgres','supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.external_id := NULL;
  ELSIF NEW.external_id IS DISTINCT FROM OLD.external_id THEN
    RAISE EXCEPTION 'Customer channel identifiers are set only by incoming messages';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_customer_external_id ON public.customers;
CREATE TRIGGER guard_customer_external_id BEFORE INSERT OR UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.guard_customer_external_id();