
-- 1. Revoke direct column access to live stream secrets
REVOKE SELECT (stream_key, rtmp_url) ON public.live_streams FROM authenticated, anon;
REVOKE SELECT (stream_key, rtmp_url) ON public.live_stream_destinations FROM authenticated, anon;

-- 2. Tighten transactions INSERT policy to prevent spoofing user_id
DROP POLICY IF EXISTS "Business members can create transactions" ON public.transactions;
CREATE POLICY "Business members can create transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  is_business_member(auth.uid(), business_id)
  AND (user_id = auth.uid() OR user_id IS NULL)
);
