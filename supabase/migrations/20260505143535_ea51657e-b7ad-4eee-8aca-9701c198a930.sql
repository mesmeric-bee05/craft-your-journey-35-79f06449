
-- ============================================================================
-- 1) Lock down storage buckets
-- ============================================================================
-- Make avatars bucket private (objects accessible only via authenticated SELECT
-- or via signed URLs). business-assets is already private.
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- Replace public read policy with authenticated-only read for avatars
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

CREATE POLICY "Authenticated users can view avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- Restrict avatar uploads to user's own folder (was missing WITH CHECK)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Restrict business-assets uploads to user's business folder (add missing WITH CHECK)
DROP POLICY IF EXISTS "Business members can upload to their business paths" ON storage.objects;
CREATE POLICY "Business members can upload to their business paths"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
  AND EXISTS (
    SELECT 1 FROM businesses b
    WHERE (storage.foldername(name))[1] = (b.id)::text
      AND (b.owner_id = auth.uid() OR is_business_member(auth.uid(), b.id))
  )
);

-- Block anonymous role from listing/reading either bucket
DROP POLICY IF EXISTS "Block anonymous storage access" ON storage.objects;
CREATE POLICY "Block anonymous storage access"
ON storage.objects
FOR SELECT
TO anon
USING (false);

-- ============================================================================
-- 2) Harden SECURITY DEFINER functions: revoke from anon/public, grant to
--    authenticated only (trigger functions stay accessible to postgres only)
-- ============================================================================
DO $$
DECLARE
  fn_name text;
  trigger_fns text[] := ARRAY[
    'handle_new_user',
    'notify_on_assignment',
    'notify_on_new_message',
    'notify_on_status_change',
    'track_sla_on_message',
    'track_sla_on_resolution',
    'update_updated_at_column'
  ];
  caller_fns text[] := ARRAY[
    'is_admin',
    'has_role',
    'is_business_member',
    'is_business_owner',
    'get_customer_masked',
    'get_csat_metrics',
    'get_csat_by_agent',
    'get_csat_by_channel',
    'get_sla_metrics',
    'get_effective_sla_targets',
    'get_safe_channels',
    'get_channel_tokens',
    'get_stream_credentials',
    'log_security_event',
    'check_sla_breaches'
  ];
BEGIN
  -- Trigger-only functions: revoke from everyone except postgres/service_role
  FOREACH fn_name IN ARRAY trigger_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I FROM PUBLIC, anon, authenticated', fn_name);
  END LOOP;

  -- Caller-invokable security definer functions: only authenticated
  FOREACH fn_name IN ARRAY caller_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I FROM PUBLIC, anon', fn_name);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I TO authenticated', fn_name);
  END LOOP;
END $$;
