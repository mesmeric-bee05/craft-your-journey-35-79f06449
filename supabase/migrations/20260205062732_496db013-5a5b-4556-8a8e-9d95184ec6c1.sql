-- Drop existing broken policies for business-assets bucket
DROP POLICY IF EXISTS "Business members can upload to their business paths" ON storage.objects;
DROP POLICY IF EXISTS "Business members can view their business assets" ON storage.objects;
DROP POLICY IF EXISTS "Business members can update their business assets" ON storage.objects;
DROP POLICY IF EXISTS "Business members can delete their business assets" ON storage.objects;

-- Recreate INSERT policy with correct syntax (using 'name' not 'b.name')
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

-- Recreate SELECT policy with correct syntax
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

-- Recreate UPDATE policy with correct syntax
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

-- Recreate DELETE policy with correct syntax
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