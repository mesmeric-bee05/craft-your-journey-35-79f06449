-- 1. Tighten ai_content insert: must be a member of the target business AND own the row
DROP POLICY IF EXISTS "Business members can create AI content" ON public.ai_content;
CREATE POLICY "Business members can create AI content"
ON public.ai_content
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_business_member(auth.uid(), business_id)
  AND user_id = auth.uid()
);

-- 2. Track email delivery of admin security alerts so digests are not sent twice
ALTER TABLE public.security_admin_notifications
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz;

CREATE INDEX IF NOT EXISTS security_admin_notifications_pending_email_idx
  ON public.security_admin_notifications (created_at)
  WHERE emailed_at IS NULL;