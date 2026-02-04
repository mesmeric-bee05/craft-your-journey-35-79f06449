-- Fix security definer view issues by setting security_invoker = true
-- This ensures the views respect RLS of the querying user, not the view creator

ALTER VIEW public.live_streams_safe SET (security_invoker = true);
ALTER VIEW public.transactions_safe SET (security_invoker = true);
ALTER VIEW public.social_channels_safe SET (security_invoker = true);

-- Update comments
COMMENT ON VIEW public.live_streams_safe IS 'Safe view of live_streams excluding sensitive stream_key and rtmp_url. Uses security_invoker for proper RLS enforcement.';
COMMENT ON VIEW public.transactions_safe IS 'Safe view of transactions with masked sensitive fields for non-owners. Uses security_invoker for proper RLS enforcement.';
COMMENT ON VIEW public.social_channels_safe IS 'Safe view of social_channels excluding OAuth tokens. Uses security_invoker for proper RLS enforcement.';