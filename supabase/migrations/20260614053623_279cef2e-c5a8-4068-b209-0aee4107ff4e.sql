
-- 1) Restrict anon enumeration of feedback_forms via a slug-scoped RPC
DROP POLICY IF EXISTS "Public read active forms by slug" ON public.feedback_forms;

CREATE OR REPLACE FUNCTION public.get_public_feedback_form(p_slug text)
RETURNS TABLE(id uuid, business_id uuid, title text, description text, is_active boolean, require_contact boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, business_id, title, description, is_active, require_contact
  FROM public.feedback_forms
  WHERE slug = lower(p_slug) AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_feedback_form(text) TO anon, authenticated;

-- 2) Realtime: scope stream:* broadcast INSERTs to topic owner
DROP POLICY IF EXISTS "Stream broadcasts scoped to owner" ON realtime.messages;
CREATE POLICY "Stream broadcasts scoped to owner"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() LIKE 'stream:' || auth.uid()::text || ':%'
);
