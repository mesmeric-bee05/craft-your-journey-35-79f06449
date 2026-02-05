-- =====================================================
-- SECURITY FIX: Add RLS to secure views
-- =====================================================
-- Views with security_invoker=true will inherit RLS from underlying tables
-- but only if the tables have RLS. We need to ensure the views are properly secured.

-- 1. PROFILES_SAFE: Already inherits from profiles which has RLS
-- Drop and recreate with proper security settings
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS
SELECT 
  p.id, 
  p.user_id, 
  p.full_name, 
  p.avatar_url, 
  p.bio, 
  p.location, 
  p.language, 
  p.timezone, 
  p.kyc_status, 
  p.is_active, 
  p.last_login_at, 
  p.created_at, 
  p.updated_at,
  -- Only show email/phone to self or admins (mask for others)
  CASE 
    WHEN p.user_id = auth.uid() OR is_admin(auth.uid()) THEN p.email 
    WHEN p.email IS NOT NULL THEN CONCAT(LEFT(p.email, 2), '***@***', 
         CASE WHEN p.email LIKE '%@%' 
              THEN SUBSTRING(p.email FROM POSITION('@' IN p.email)) 
              ELSE '' END)
    ELSE NULL
  END as email,
  CASE 
    WHEN p.user_id = auth.uid() OR is_admin(auth.uid()) THEN p.phone 
    WHEN p.phone IS NOT NULL THEN CONCAT('+***', RIGHT(p.phone, 4))
    ELSE NULL
  END as phone,
  -- NEVER expose KYC documents to others
  CASE 
    WHEN p.user_id = auth.uid() OR is_admin(auth.uid()) THEN p.kyc_document_url 
    ELSE NULL 
  END as kyc_document_url
FROM profiles p;

COMMENT ON VIEW public.profiles_safe IS 'Secure view that masks email/phone for non-owners and hides KYC documents. Inherits RLS from profiles table.';

-- 2. CUSTOMERS_SAFE: Already inherits from customers which has RLS  
DROP VIEW IF EXISTS public.customers_safe;
CREATE VIEW public.customers_safe 
WITH (security_invoker = true)
AS
SELECT 
  c.id,
  c.business_id,
  c.name,
  c.avatar_url,
  c.channel_type,
  c.tags,
  c.first_contact_at,
  c.last_contact_at,
  c.created_at,
  c.updated_at,
  c.external_id,
  c.metadata,
  -- Mask email for non-business-owners
  CASE 
    WHEN EXISTS (SELECT 1 FROM businesses b WHERE b.id = c.business_id AND b.owner_id = auth.uid())
         OR is_admin(auth.uid()) 
    THEN c.email 
    WHEN c.email IS NOT NULL THEN CONCAT(LEFT(c.email, 2), '***@***', 
         SUBSTRING(c.email FROM POSITION('@' IN c.email)))
    ELSE NULL
  END as email,
  -- Mask phone for non-business-owners
  CASE 
    WHEN EXISTS (SELECT 1 FROM businesses b WHERE b.id = c.business_id AND b.owner_id = auth.uid())
         OR is_admin(auth.uid()) 
    THEN c.phone 
    WHEN c.phone IS NOT NULL THEN CONCAT('+***', RIGHT(c.phone, 4))
    ELSE NULL
  END as phone,
  -- Hide notes from non-owners (may contain sensitive info)
  CASE 
    WHEN EXISTS (SELECT 1 FROM businesses b WHERE b.id = c.business_id AND b.owner_id = auth.uid())
         OR is_admin(auth.uid()) 
    THEN c.notes 
    ELSE NULL
  END as notes
FROM customers c;

COMMENT ON VIEW public.customers_safe IS 'Secure view that masks customer email/phone/notes for non-business-owners. Inherits RLS from customers table.';

-- 3. TRANSACTIONS_SAFE: Already inherits from transactions which has RLS
DROP VIEW IF EXISTS public.transactions_safe;
CREATE VIEW public.transactions_safe 
WITH (security_invoker = true)
AS
SELECT 
  t.id,
  t.business_id,
  t.wallet_id,
  t.user_id,
  t.type,
  t.amount,
  t.status,
  t.created_at,
  t.updated_at,
  t.completed_at,
  -- Mask recipient info for non-owners
  CASE 
    WHEN t.user_id = auth.uid() 
         OR is_business_owner(auth.uid(), t.business_id)
         OR is_admin(auth.uid())
    THEN t.recipient_phone
    WHEN t.recipient_phone IS NOT NULL THEN CONCAT('+***', RIGHT(t.recipient_phone, 4))
    ELSE NULL
  END as recipient_phone,
  t.description,
  t.reference,
  CASE 
    WHEN t.user_id = auth.uid() 
         OR is_business_owner(auth.uid(), t.business_id)
         OR is_admin(auth.uid())
    THEN t.recipient_email
    WHEN t.recipient_email IS NOT NULL THEN CONCAT(LEFT(t.recipient_email, 2), '***@***',
         SUBSTRING(t.recipient_email FROM POSITION('@' IN t.recipient_email)))
    ELSE NULL
  END as recipient_email,
  t.external_reference,
  t.payment_method,
  t.currency
FROM transactions t;

COMMENT ON VIEW public.transactions_safe IS 'Secure view that masks recipient info for non-transaction-owners. Inherits RLS from transactions table.';

-- 4. SOCIAL_CHANNELS_SAFE: Already inherits from social_channels which has RLS
-- Already exists and is properly configured, just verify it inherits RLS
DROP VIEW IF EXISTS public.social_channels_safe;
CREATE VIEW public.social_channels_safe 
WITH (security_invoker = true)
AS
SELECT 
  id, 
  business_id, 
  channel_type, 
  channel_name, 
  is_connected, 
  is_active, 
  connected_at, 
  metadata, 
  created_at, 
  updated_at
  -- EXCLUDE: access_token, refresh_token, token_expires_at (sensitive)
FROM social_channels;

COMMENT ON VIEW public.social_channels_safe IS 'Secure view excluding OAuth tokens. Inherits RLS from social_channels table.';

-- 5. LIVE_STREAMS_SAFE: Already inherits from live_streams which has RLS
DROP VIEW IF EXISTS public.live_streams_safe;
CREATE VIEW public.live_streams_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  business_id,
  title,
  description,
  status,
  viewer_count,
  peak_viewers,
  platforms,
  metadata,
  started_at,
  ended_at,
  created_at,
  updated_at
  -- EXCLUDE: stream_key, rtmp_url (sensitive streaming credentials)
FROM live_streams;

COMMENT ON VIEW public.live_streams_safe IS 'Secure view excluding stream credentials. Inherits RLS from live_streams table.';