-- Force drop ALL existing business-assets policies
DROP POLICY IF EXISTS "Business members can upload to their business paths" ON storage.objects;
DROP POLICY IF EXISTS "Business members can view their business assets" ON storage.objects;
DROP POLICY IF EXISTS "Business members can update their business assets" ON storage.objects;
DROP POLICY IF EXISTS "Business members can delete their business assets" ON storage.objects;

-- INSERT policy - reference name using objects.name to avoid ambiguity with alias
CREATE POLICY "Business members can upload to their business paths"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
  AND (storage.foldername(objects.name))[1] IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(objects.name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);

-- SELECT policy - explicitly reference objects.name  
CREATE POLICY "Business members can view their business assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(objects.name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);

-- UPDATE policy
CREATE POLICY "Business members can update their business assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(objects.name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);

-- DELETE policy
CREATE POLICY "Business members can delete their business assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(objects.name))[1] = b.id::text
    AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);