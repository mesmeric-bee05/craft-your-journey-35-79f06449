-- =====================================================
-- Security Migration: Fix Storage and RLS Policies
-- =====================================================

-- 1. Make business-assets bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'business-assets';

-- 2. Drop existing permissive storage policies
DROP POLICY IF EXISTS "Business owners can upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view business assets" ON storage.objects;

-- 3. Create secure storage policies that verify business membership
-- Upload policy: Only business members can upload to their business folder
CREATE POLICY "Business members can upload to their business paths"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
  AND (storage.foldername(name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);

-- View policy: Business members can view their business assets
CREATE POLICY "Business members can view their business assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);

-- Update policy: Business members can update their business assets
CREATE POLICY "Business members can update their business assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);

-- Delete policy: Business members can delete their business assets
CREATE POLICY "Business members can delete their business assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);

-- 4. Fix CSAT responses INSERT policy - drop the overly permissive one
DROP POLICY IF EXISTS "System can insert CSAT responses" ON public.csat_responses;

-- 5. Create secure CSAT response INSERT policy
-- Only business members can submit CSAT responses for conversations they have access to
CREATE POLICY "Business members can submit CSAT responses"
ON public.csat_responses FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND public.is_business_member(auth.uid(), c.business_id)
  )
);