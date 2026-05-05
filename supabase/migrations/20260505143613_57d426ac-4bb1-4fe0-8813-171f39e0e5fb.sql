
UPDATE storage.buckets SET public = true WHERE id = 'avatars';

DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;

CREATE POLICY "Avatars are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

-- Tighten anon block: only block anon for non-public buckets
DROP POLICY IF EXISTS "Block anonymous storage access" ON storage.objects;
CREATE POLICY "Block anonymous access to private buckets"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id IN (SELECT id FROM storage.buckets WHERE public = false) AND false);
