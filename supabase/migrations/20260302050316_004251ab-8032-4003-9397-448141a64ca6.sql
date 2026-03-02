
-- Recreate the safe view with an inline business membership check
-- This is SECURITY DEFINER by default (no security_invoker) which is intentional
-- so that business members can read non-sensitive channel data even though
-- the base table SELECT is restricted to owners only.
-- security_barrier prevents predicate pushdown attacks.
DROP VIEW IF EXISTS public.social_channels_safe;

CREATE VIEW public.social_channels_safe
WITH (security_barrier = true)
AS
SELECT 
  sc.id, sc.business_id, sc.channel_type, sc.channel_name,
  sc.is_connected, sc.is_active, sc.connected_at, sc.metadata,
  sc.settings, sc.created_at, sc.updated_at
FROM public.social_channels sc
WHERE public.is_business_member(auth.uid(), sc.business_id)
   OR public.is_admin(auth.uid());
