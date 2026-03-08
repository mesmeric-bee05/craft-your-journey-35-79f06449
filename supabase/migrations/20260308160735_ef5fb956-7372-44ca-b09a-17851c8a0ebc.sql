
-- Fix safe views: recreate with security_invoker = true

DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe
WITH (security_invoker = true) AS
SELECT 
  id, user_id, kyc_status, is_active, last_login_at, created_at, updated_at,
  full_name, avatar_url, bio, location, language, timezone,
  CASE WHEN user_id = auth.uid() THEN kyc_document_url ELSE NULL END as kyc_document_url,
  CASE WHEN user_id = auth.uid() THEN email ELSE NULL END as email,
  CASE WHEN user_id = auth.uid() THEN phone ELSE NULL END as phone
FROM public.profiles;
GRANT SELECT ON public.profiles_safe TO authenticated, anon;

DROP VIEW IF EXISTS public.transactions_safe;
CREATE VIEW public.transactions_safe
WITH (security_invoker = true) AS
SELECT 
  id, business_id, wallet_id, user_id, type, amount, status,
  created_at, updated_at, completed_at, metadata, description,
  payment_method, reference, external_reference, currency,
  CASE WHEN user_id = auth.uid() THEN recipient_phone ELSE NULL END as recipient_phone,
  CASE WHEN user_id = auth.uid() THEN recipient_email ELSE NULL END as recipient_email
FROM public.transactions;
GRANT SELECT ON public.transactions_safe TO authenticated, anon;

DROP VIEW IF EXISTS public.customers_safe;
CREATE VIEW public.customers_safe
WITH (security_invoker = true) AS
SELECT 
  id, business_id, channel_type, first_contact_at, last_contact_at,
  created_at, updated_at, metadata, avatar_url, tags, notes, external_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM businesses b WHERE b.id = customers.business_id AND b.owner_id = auth.uid())
    THEN email ELSE NULL 
  END as email,
  CASE 
    WHEN EXISTS (SELECT 1 FROM businesses b WHERE b.id = customers.business_id AND b.owner_id = auth.uid())
    THEN phone ELSE NULL 
  END as phone,
  name
FROM public.customers;
GRANT SELECT ON public.customers_safe TO authenticated, anon;

DROP VIEW IF EXISTS public.live_streams_safe;
CREATE VIEW public.live_streams_safe
WITH (security_invoker = true) AS
SELECT 
  id, business_id, created_at, description, ended_at, metadata,
  peak_viewers, platforms, started_at, status, title, updated_at,
  user_id, viewer_count
FROM public.live_streams;
GRANT SELECT ON public.live_streams_safe TO authenticated, anon;
