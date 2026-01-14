-- Phase 1: Critical RLS Security Fixes

-- 1.1 Fix Profiles - Require authentication for access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Business members can view team profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_members bm1
    JOIN business_members bm2 ON bm1.business_id = bm2.business_id
    WHERE bm1.user_id = auth.uid()
    AND bm2.user_id = profiles.user_id
    AND bm1.is_active = true
    AND bm2.is_active = true
  )
);

-- 1.2 Fix Freelancer Profiles - Require authentication
DROP POLICY IF EXISTS "Anyone can view freelancer profiles" ON public.freelancer_profiles;

CREATE POLICY "Authenticated users can view freelancer profiles"
ON public.freelancer_profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 1.3 Fix Reviews - Require authentication
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;

CREATE POLICY "Authenticated users can view reviews"
ON public.reviews FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 1.4 Fix Job Postings - Require authentication for full details
DROP POLICY IF EXISTS "Anyone can view published job postings" ON public.job_postings;

CREATE POLICY "Authenticated users can view open job postings"
ON public.job_postings FOR SELECT
USING (auth.uid() IS NOT NULL AND status = 'open');

-- 1.5 Protect Social Channel Tokens - Create secure view
CREATE OR REPLACE VIEW public.social_channels_safe AS
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
FROM public.social_channels;

GRANT SELECT ON public.social_channels_safe TO authenticated;

-- 1.6 Contracts table - ensure auth required (uses business_id and freelancer_id)
DROP POLICY IF EXISTS "Anyone can view contracts" ON public.contracts;

CREATE POLICY "Business and freelancer can view contracts"
ON public.contracts FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    public.is_business_member(auth.uid(), business_id) OR 
    freelancer_id = auth.uid()
  )
);