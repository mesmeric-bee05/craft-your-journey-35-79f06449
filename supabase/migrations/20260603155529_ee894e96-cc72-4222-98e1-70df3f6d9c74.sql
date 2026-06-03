
-- Fix 1: Remove overly broad business-assets storage policies (any auth user could delete/update)
DROP POLICY IF EXISTS "Business owners can delete their assets" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update their assets" ON storage.objects;

-- Fix 2: Recreate INSERT policy with correct path check (was checking b.name instead of objects.name)
DROP POLICY IF EXISTS "Business members can upload to their business paths" ON storage.objects;
CREATE POLICY "Business members can upload to their business paths"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE (storage.foldername(objects.name))[1] = (b.id)::text
      AND (b.owner_id = auth.uid() OR public.is_business_member(auth.uid(), b.id))
  )
);

-- Fix 3: Restrict Realtime channel subscriptions to business members / own user topics
-- Topic format expected: "business:<business_id>:*" or "user:<auth.uid()>:*"
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read own scoped realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can read own scoped realtime topics"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  (
    (realtime.topic() LIKE 'business:%')
    AND public.is_business_member(
      auth.uid(),
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR (
    (realtime.topic() LIKE 'user:%')
    AND split_part(realtime.topic(), ':', 2) = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Authenticated can broadcast to own scoped realtime topics" ON realtime.messages;
CREATE POLICY "Authenticated can broadcast to own scoped realtime topics"
ON realtime.messages FOR INSERT
TO authenticated
WITH CHECK (
  (
    (realtime.topic() LIKE 'business:%')
    AND public.is_business_member(
      auth.uid(),
      NULLIF(split_part(realtime.topic(), ':', 2), '')::uuid
    )
  )
  OR (
    (realtime.topic() LIKE 'user:%')
    AND split_part(realtime.topic(), ':', 2) = auth.uid()::text
  )
);
