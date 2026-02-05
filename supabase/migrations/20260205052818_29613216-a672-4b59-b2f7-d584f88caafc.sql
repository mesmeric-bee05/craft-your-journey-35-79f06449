-- =====================================================
-- SECURITY HARDENING: Fix Access Control Vulnerabilities
-- =====================================================

-- 1. FIX ANALYTICS FUNCTIONS - Add business membership validation
-- These SECURITY DEFINER functions were allowing any authenticated user
-- to query analytics for ANY business by providing a business_id

-- Fix get_sla_metrics
CREATE OR REPLACE FUNCTION public.get_sla_metrics(
  p_business_id uuid, 
  p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), 
  p_end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE(
  total_conversations bigint, 
  avg_first_response_minutes numeric, 
  avg_resolution_minutes numeric, 
  first_response_breach_count bigint, 
  resolution_breach_count bigint, 
  first_response_compliance_rate numeric, 
  resolution_compliance_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- SECURITY: Verify caller has access to this business
  IF NOT is_business_member(auth.uid(), p_business_id) AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: You are not a member of this business'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_conversations,
    ROUND(AVG(st.first_response_time)::NUMERIC, 1) as avg_first_response_minutes,
    ROUND(AVG(st.resolution_time)::NUMERIC, 1) as avg_resolution_minutes,
    COUNT(*) FILTER (WHERE st.first_response_breached)::BIGINT as first_response_breach_count,
    COUNT(*) FILTER (WHERE st.resolution_breached)::BIGINT as resolution_breach_count,
    ROUND(
      (COUNT(*) FILTER (WHERE NOT st.first_response_breached AND st.first_response_at IS NOT NULL)::NUMERIC 
       / NULLIF(COUNT(*) FILTER (WHERE st.first_response_at IS NOT NULL), 0) * 100), 
      1
    ) as first_response_compliance_rate,
    ROUND(
      (COUNT(*) FILTER (WHERE NOT st.resolution_breached AND st.resolved_at IS NOT NULL)::NUMERIC 
       / NULLIF(COUNT(*) FILTER (WHERE st.resolved_at IS NOT NULL), 0) * 100), 
      1
    ) as resolution_compliance_rate
  FROM sla_tracking st
  JOIN conversations c ON c.id = st.conversation_id
  WHERE c.business_id = p_business_id
    AND st.created_at BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Fix get_csat_metrics
CREATE OR REPLACE FUNCTION public.get_csat_metrics(
  p_business_id uuid, 
  p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), 
  p_end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE(
  total_responses bigint, 
  avg_rating numeric, 
  nps_score numeric, 
  rating_1_count bigint, 
  rating_2_count bigint, 
  rating_3_count bigint, 
  rating_4_count bigint, 
  rating_5_count bigint, 
  response_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_resolved BIGINT;
BEGIN
  -- SECURITY: Verify caller has access to this business
  IF NOT is_business_member(auth.uid(), p_business_id) AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: You are not a member of this business'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Count total resolved conversations in period
  SELECT COUNT(*) INTO v_total_resolved
  FROM sla_tracking st
  JOIN conversations c ON c.id = st.conversation_id
  WHERE c.business_id = p_business_id
  AND st.resolved_at BETWEEN p_start_date AND p_end_date;

  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_responses,
    ROUND(AVG(r.rating)::NUMERIC, 2) as avg_rating,
    ROUND(
      (COUNT(*) FILTER (WHERE r.rating >= 5)::NUMERIC - COUNT(*) FILTER (WHERE r.rating <= 2)::NUMERIC) 
      / NULLIF(COUNT(*), 0) * 100,
      1
    ) as nps_score,
    COUNT(*) FILTER (WHERE r.rating = 1)::BIGINT as rating_1_count,
    COUNT(*) FILTER (WHERE r.rating = 2)::BIGINT as rating_2_count,
    COUNT(*) FILTER (WHERE r.rating = 3)::BIGINT as rating_3_count,
    COUNT(*) FILTER (WHERE r.rating = 4)::BIGINT as rating_4_count,
    COUNT(*) FILTER (WHERE r.rating = 5)::BIGINT as rating_5_count,
    ROUND(
      COUNT(*)::NUMERIC / NULLIF(v_total_resolved, 0) * 100,
      1
    ) as response_rate
  FROM csat_responses r
  WHERE r.business_id = p_business_id
  AND r.responded_at BETWEEN p_start_date AND p_end_date;
END;
$$;

-- Fix get_csat_by_agent
CREATE OR REPLACE FUNCTION public.get_csat_by_agent(
  p_business_id uuid, 
  p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), 
  p_end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE(agent_id uuid, agent_name text, total_responses bigint, avg_rating numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- SECURITY: Verify caller has access to this business
  IF NOT is_business_member(auth.uid(), p_business_id) AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: You are not a member of this business'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    r.assigned_agent_id,
    COALESCE(p.full_name, 'Unassigned') as agent_name,
    COUNT(*)::BIGINT as total_responses,
    ROUND(AVG(r.rating)::NUMERIC, 2) as avg_rating
  FROM csat_responses r
  LEFT JOIN profiles p ON p.user_id = r.assigned_agent_id
  WHERE r.business_id = p_business_id
  AND r.responded_at BETWEEN p_start_date AND p_end_date
  GROUP BY r.assigned_agent_id, p.full_name
  ORDER BY avg_rating DESC;
END;
$$;

-- Fix get_csat_by_channel
CREATE OR REPLACE FUNCTION public.get_csat_by_channel(
  p_business_id uuid, 
  p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), 
  p_end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE(channel_type channel_type, total_responses bigint, avg_rating numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- SECURITY: Verify caller has access to this business
  IF NOT is_business_member(auth.uid(), p_business_id) AND NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: You are not a member of this business'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    r.channel_type,
    COUNT(*)::BIGINT as total_responses,
    ROUND(AVG(r.rating)::NUMERIC, 2) as avg_rating
  FROM csat_responses r
  WHERE r.business_id = p_business_id
  AND r.responded_at BETWEEN p_start_date AND p_end_date
  GROUP BY r.channel_type
  ORDER BY avg_rating DESC;
END;
$$;

-- 2. CREATE SECURE PROFILES VIEW - Hide sensitive fields from non-owners
-- This protects email, phone, and KYC documents while allowing team collaboration
DROP VIEW IF EXISTS public.profiles_safe;
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS
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
  is_active, 
  last_login_at, 
  created_at, 
  updated_at,
  -- Only show email/phone to self or admins (mask for others)
  CASE 
    WHEN user_id = auth.uid() OR is_admin(auth.uid()) THEN email 
    ELSE CONCAT(LEFT(email, 2), '***@***', 
         CASE WHEN email LIKE '%@%' 
              THEN SUBSTRING(email FROM POSITION('@' IN email)) 
              ELSE '' END)
  END as email,
  CASE 
    WHEN user_id = auth.uid() OR is_admin(auth.uid()) THEN phone 
    WHEN phone IS NOT NULL THEN CONCAT('+***', RIGHT(phone, 4))
    ELSE NULL
  END as phone,
  -- NEVER expose KYC documents to others
  CASE 
    WHEN user_id = auth.uid() OR is_admin(auth.uid()) THEN kyc_document_url 
    ELSE NULL 
  END as kyc_document_url
FROM profiles;

COMMENT ON VIEW public.profiles_safe IS 'Secure view that masks email/phone for non-owners and hides KYC documents';

-- 3. UPDATE get_customer_masked TO PROPERLY MASK FOR ALL NON-OWNERS
-- The existing function only masks for non-business-owners, but should mask for all non-owners
CREATE OR REPLACE FUNCTION public.get_customer_masked(p_customer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer RECORD;
  v_is_owner boolean;
BEGIN
  SELECT c.*, 
         (SELECT b.owner_id = auth.uid() FROM businesses b WHERE b.id = c.business_id) as is_owner
  INTO v_customer
  FROM customers c
  WHERE c.id = p_customer_id
    AND public.is_business_member(auth.uid(), c.business_id);
    
  IF v_customer IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Owners see full data, members see masked
  IF v_customer.is_owner OR is_admin(auth.uid()) THEN
    RETURN jsonb_build_object(
      'id', v_customer.id,
      'name', v_customer.name,
      'email', v_customer.email,
      'phone', v_customer.phone,
      'avatar_url', v_customer.avatar_url,
      'tags', v_customer.tags,
      'notes', v_customer.notes,
      'channel_type', v_customer.channel_type,
      'first_contact_at', v_customer.first_contact_at,
      'last_contact_at', v_customer.last_contact_at
    );
  ELSE
    -- Mask email and phone for non-owners
    RETURN jsonb_build_object(
      'id', v_customer.id,
      'name', v_customer.name,
      'email', CASE WHEN v_customer.email IS NOT NULL 
               THEN CONCAT(LEFT(v_customer.email, 2), '***@***', 
                    SUBSTRING(v_customer.email FROM POSITION('@' IN v_customer.email)))
               ELSE NULL END,
      'phone', CASE WHEN v_customer.phone IS NOT NULL 
               THEN CONCAT('+***', RIGHT(v_customer.phone, 4))
               ELSE NULL END,
      'avatar_url', v_customer.avatar_url,
      'tags', v_customer.tags,
      'channel_type', v_customer.channel_type,
      'first_contact_at', v_customer.first_contact_at,
      'last_contact_at', v_customer.last_contact_at
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION public.get_customer_masked IS 'Returns customer data with masked email/phone for non-business-owners';

-- 4. CREATE customers_safe VIEW FOR DIRECT TABLE ACCESS
DROP VIEW IF EXISTS public.customers_safe;
CREATE VIEW public.customers_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  business_id,
  name,
  avatar_url,
  channel_type,
  tags,
  first_contact_at,
  last_contact_at,
  created_at,
  updated_at,
  external_id,
  metadata,
  -- Mask email for non-business-owners
  CASE 
    WHEN EXISTS (SELECT 1 FROM businesses b WHERE b.id = customers.business_id AND b.owner_id = auth.uid())
         OR is_admin(auth.uid()) 
    THEN email 
    WHEN email IS NOT NULL THEN CONCAT(LEFT(email, 2), '***@***', 
         SUBSTRING(email FROM POSITION('@' IN email)))
    ELSE NULL
  END as email,
  -- Mask phone for non-business-owners
  CASE 
    WHEN EXISTS (SELECT 1 FROM businesses b WHERE b.id = customers.business_id AND b.owner_id = auth.uid())
         OR is_admin(auth.uid()) 
    THEN phone 
    WHEN phone IS NOT NULL THEN CONCAT('+***', RIGHT(phone, 4))
    ELSE NULL
  END as phone,
  -- Hide notes from non-owners (may contain sensitive info)
  CASE 
    WHEN EXISTS (SELECT 1 FROM businesses b WHERE b.id = customers.business_id AND b.owner_id = auth.uid())
         OR is_admin(auth.uid()) 
    THEN notes 
    ELSE NULL
  END as notes
FROM customers;

COMMENT ON VIEW public.customers_safe IS 'Secure view that masks customer email/phone/notes for non-business-owners';