
-- Tighten column-level access to sensitive fields so they cannot be read through broad SELECTs,
-- even when row-level policies permit reading the row (e.g. team-member profile reads).

-- 1) profiles.kyc_* — only the owner (via dedicated RPC) and service_role should ever read these.
REVOKE SELECT (kyc_document_url, kyc_status) ON public.profiles FROM anon, authenticated;
GRANT  SELECT (kyc_document_url, kyc_status) ON public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_kyc()
RETURNS TABLE(kyc_status text, kyc_document_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT kyc_status, kyc_document_url
  FROM public.profiles
  WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.get_my_kyc() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_kyc() TO authenticated;

-- 2) live streaming credentials — only the get_stream_credentials() RPC (security definer) or service_role
--    should ever return these columns to clients.
REVOKE SELECT (stream_key, rtmp_url) ON public.live_streams FROM anon, authenticated;
GRANT  SELECT (stream_key, rtmp_url) ON public.live_streams TO service_role;

REVOKE SELECT (stream_key, rtmp_url) ON public.live_stream_destinations FROM anon, authenticated;
GRANT  SELECT (stream_key, rtmp_url) ON public.live_stream_destinations TO service_role;

-- 3) social_channels OAuth tokens — only the get_channel_tokens() RPC (owner-scoped) or service_role
--    should ever return access_token / refresh_token. (SELECT policy is already owner-only,
--    this is defense-in-depth so accidental SELECT * never leaks tokens.)
REVOKE SELECT (access_token, refresh_token) ON public.social_channels FROM anon, authenticated;
GRANT  SELECT (access_token, refresh_token) ON public.social_channels TO service_role;
