-- Force drop ALL existing business-assets policies by name
DROP POLICY IF EXISTS "Business members can upload to their business paths" ON storage.objects;
DROP POLICY IF EXISTS "Business members can view their business assets" ON storage.objects;
DROP POLICY IF EXISTS "Business members can update their business assets" ON storage.objects;
DROP POLICY IF EXISTS "Business members can delete their business assets" ON storage.objects;

-- Verify they're dropped and recreate with CORRECT syntax
-- INSERT policy - uses WITH CHECK and references 'name' (the file path), NOT 'b.name'
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

-- SELECT policy - uses USING and references 'name' (the file path)
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

-- UPDATE policy
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

-- DELETE policy
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