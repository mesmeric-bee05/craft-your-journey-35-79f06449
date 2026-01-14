-- Fix security definer view by using security_invoker
DROP VIEW IF EXISTS public.social_channels_safe;

CREATE VIEW public.social_channels_safe
WITH (security_invoker = on) AS
SELECT 
  id,
  business_id,
  channel_type,
  channel_name,
  is_connected,
  is_active,
  connected_at,
  metadata,
  created_at,
  updated_at
FROM public.social_channels;

GRANT SELECT ON public.social_channels_safe TO authenticated;