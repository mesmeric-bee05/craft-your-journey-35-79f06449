REVOKE EXECUTE ON FUNCTION public.check_sla_breaches() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_sla_breaches() TO service_role;

DROP POLICY IF EXISTS "Users view own BRS" ON public.burnout_risk_scores;
CREATE POLICY "Users view own BRS" ON public.burnout_risk_scores FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE INSERT, UPDATE, DELETE ON public.burnout_risk_scores FROM authenticated, anon;
GRANT ALL ON public.burnout_risk_scores TO service_role;

REVOKE INSERT, UPDATE ON public.businesses FROM authenticated, anon;
GRANT INSERT (id,owner_id,name,slug,description,logo_url,cover_image_url,business_type,industry,website,email,phone,address,city,country,latitude,longitude,registration_number,tax_id,is_active,settings,metadata,created_at,updated_at,onboarding_step,onboarding_completed) ON public.businesses TO authenticated;
GRANT UPDATE (name,slug,description,logo_url,cover_image_url,business_type,industry,website,email,phone,address,city,country,latitude,longitude,registration_number,tax_id,is_active,settings,metadata,updated_at,onboarding_step,onboarding_completed) ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;

CREATE OR REPLACE FUNCTION public.admin_set_business_verified(_business_id uuid, _verified boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Only admins can change the verified badge'; END IF;
  UPDATE public.businesses SET is_verified = _verified, updated_at = now() WHERE id = _business_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_business_verified(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_business_verified(uuid, boolean) TO authenticated;