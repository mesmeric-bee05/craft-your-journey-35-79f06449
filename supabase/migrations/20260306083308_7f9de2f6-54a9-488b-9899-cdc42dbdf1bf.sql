-- Fix profiles_safe view to mask email and phone for non-owners
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  full_name,
  avatar_url,
  bio,
  location,
  language,
  timezone,
  kyc_status,
  kyc_document_url,
  is_active,
  last_login_at,
  created_at,
  updated_at,
  CASE WHEN user_id = auth.uid() THEN email ELSE CONCAT(LEFT(email, 2), '***@***') END AS email,
  CASE WHEN user_id = auth.uid() THEN phone ELSE CONCAT(LEFT(phone, 4), '****') END AS phone
FROM public.profiles;

-- Fix customers_safe view to mask PII
DROP VIEW IF EXISTS public.customers_safe;
CREATE VIEW public.customers_safe WITH (security_invoker = true) AS
SELECT
  id,
  business_id,
  name,
  channel_type,
  avatar_url,
  tags,
  notes,
  first_contact_at,
  last_contact_at,
  created_at,
  updated_at,
  external_id,
  metadata,
  CONCAT(LEFT(COALESCE(email, ''), 2), '***@***') AS email,
  CONCAT(LEFT(COALESCE(phone, ''), 4), '****') AS phone
FROM public.customers;

-- Fix transactions_safe view to mask recipient details
DROP VIEW IF EXISTS public.transactions_safe;
CREATE VIEW public.transactions_safe WITH (security_invoker = true) AS
SELECT
  id,
  business_id,
  wallet_id,
  user_id,
  type,
  amount,
  currency,
  status,
  description,
  payment_method,
  reference,
  external_reference,
  created_at,
  updated_at,
  completed_at,
  metadata,
  CONCAT(LEFT(COALESCE(recipient_phone, ''), 4), '****') AS recipient_phone,
  CONCAT(LEFT(COALESCE(recipient_email, ''), 2), '***@***') AS recipient_email
FROM public.transactions;