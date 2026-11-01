-- Wallets: a former (deactivated) team member must lose access immediately.
-- The old SELECT policy allowed user_id = auth.uid() with no active-membership
-- check, so removed members could still read their wallet row.

DROP POLICY IF EXISTS "Users can view own business wallets" ON public.wallets;
CREATE POLICY "Users can view own business wallets"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (public.is_business_member(auth.uid(), business_id));

-- Same rule for updates: only active members (or the business owner) may
-- touch their wallet row.
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
CREATE POLICY "Users can update own wallet"
  ON public.wallets FOR UPDATE
  TO authenticated
  USING (
    public.is_business_owner(auth.uid(), business_id)
    OR (user_id = auth.uid() AND public.is_business_member(auth.uid(), business_id))
  )
  WITH CHECK (
    public.is_business_owner(auth.uid(), business_id)
    OR (user_id = auth.uid() AND public.is_business_member(auth.uid(), business_id))
  );
