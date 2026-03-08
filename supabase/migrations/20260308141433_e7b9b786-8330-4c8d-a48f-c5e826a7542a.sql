
-- Fix 1: Ensure safe views have security_invoker = true so they inherit base table RLS
-- Drop and recreate views with security_invoker

-- profiles_safe
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe WITH (security_invoker = true) AS
SELECT
  id, user_id, kyc_status, is_active, last_login_at, created_at, updated_at,
  full_name, avatar_url, bio, location, language, timezone,
  CASE WHEN user_id = auth.uid() THEN kyc_document_url ELSE NULL END AS kyc_document_url,
  CASE WHEN user_id = auth.uid() THEN email ELSE NULL END AS email,
  CASE WHEN user_id = auth.uid() THEN phone ELSE NULL END AS phone
FROM public.profiles;

-- transactions_safe
DROP VIEW IF EXISTS public.transactions_safe;
CREATE VIEW public.transactions_safe WITH (security_invoker = true) AS
SELECT
  id, business_id, wallet_id, user_id, type, amount, status,
  created_at, updated_at, completed_at, metadata, description,
  payment_method, reference, external_reference, currency,
  CASE WHEN user_id = auth.uid() THEN recipient_phone ELSE NULL END AS recipient_phone,
  CASE WHEN user_id = auth.uid() THEN recipient_email ELSE NULL END AS recipient_email
FROM public.transactions;

-- customers_safe
DROP VIEW IF EXISTS public.customers_safe;
CREATE VIEW public.customers_safe WITH (security_invoker = true) AS
SELECT
  id, business_id, channel_type, first_contact_at, last_contact_at,
  created_at, updated_at, metadata, avatar_url, tags, notes, external_id,
  email, phone, name
FROM public.customers;

-- live_streams_safe
DROP VIEW IF EXISTS public.live_streams_safe;
CREATE VIEW public.live_streams_safe WITH (security_invoker = true) AS
SELECT
  id, business_id, user_id, title, description, status,
  started_at, ended_at, viewer_count, peak_viewers,
  platforms, metadata, created_at, updated_at
FROM public.live_streams;

-- Fix 2: Tighten SLA breach logs INSERT policy to service_role only
DROP POLICY IF EXISTS "System can insert breach logs" ON public.sla_breach_logs;
CREATE POLICY "System can insert breach logs"
  ON public.sla_breach_logs
  FOR INSERT
  WITH CHECK (current_setting('role'::text, true) = 'service_role'::text);
