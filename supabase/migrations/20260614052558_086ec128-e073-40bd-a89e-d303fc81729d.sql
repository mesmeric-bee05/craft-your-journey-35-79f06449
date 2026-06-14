
-- 1. Tighten anonymous feedback submission policy
DROP POLICY IF EXISTS "Public insert via active form" ON public.feedback_submissions;
CREATE POLICY "Public insert via active form"
ON public.feedback_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  source = 'public_form'
  AND form_id IS NOT NULL
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.feedback_forms f
    WHERE f.id = feedback_submissions.form_id
      AND f.is_active = true
      AND f.business_id = feedback_submissions.business_id
  )
);

-- 2. Tighten bundle_events insert policy
DROP POLICY IF EXISTS "anyone can log bundle views" ON public.bundle_events;
CREATE POLICY "anyone can log bundle views"
ON public.bundle_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type = ANY (ARRAY['view'::text, 'click'::text])
  AND EXISTS (
    SELECT 1 FROM public.bundles b
    WHERE b.id = bundle_events.bundle_id
      AND b.business_id = bundle_events.business_id
      AND b.is_active = true
  )
);

-- 3. Restrict wallet UPDATE to the wallet owner only.
--    Service role bypasses RLS, so edge functions (wallet-operations, payment-webhook,
--    mpesa-callback) continue to work. Business owners can no longer mutate other
--    members' wallet balances directly through the API.
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;
CREATE POLICY "Users can update own wallet"
ON public.wallets
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Mask recipient_phone / recipient_email on transactions for non-owner business members.
--    Use column-level REVOKE so only the transaction creator, business owner, or admin
--    can read those columns. Other members still see the rest of the row.
--    Implementation: change the SELECT policy to require ownership/admin for full-row
--    access, and expose a masked view for general business members.
DROP POLICY IF EXISTS "Business members can view transactions" ON public.transactions;

-- Owners and admins (and the user who created the transaction) see raw rows.
CREATE POLICY "Owners and creators view full transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_business_owner(auth.uid(), business_id)
  OR public.is_admin(auth.uid())
);

-- Revoke direct read on sensitive recipient columns from non-owners by using a
-- column-level grant model: revoke on the table, then re-grant non-sensitive columns
-- to authenticated. Owners/creators still see them via the policy above + table grant
-- to service_role / masked RPC. Simpler approach: keep table grants, and add a
-- secondary policy that allows other members to SELECT only when sensitive columns
-- are NULL via a view. Postgres RLS can't filter columns, so we add a masked RPC.

CREATE OR REPLACE FUNCTION public.get_transactions_masked(
  p_business_id uuid,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  business_id uuid,
  wallet_id uuid,
  user_id uuid,
  type transaction_type,
  amount numeric,
  currency text,
  status transaction_status,
  description text,
  reference text,
  payment_method text,
  recipient_phone text,
  recipient_email text,
  external_reference text,
  metadata jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  completed_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_owner boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NOT public.is_business_member(v_uid, p_business_id) AND NOT public.is_admin(v_uid) THEN
    RAISE EXCEPTION 'access denied' USING ERRCODE = 'insufficient_privilege';
  END IF;
  v_is_owner := public.is_business_owner(v_uid, p_business_id) OR public.is_admin(v_uid);

  RETURN QUERY
  SELECT
    t.id, t.business_id, t.wallet_id, t.user_id, t.type, t.amount, t.currency, t.status,
    t.description, t.reference, t.payment_method,
    CASE
      WHEN t.recipient_phone IS NULL THEN NULL
      WHEN v_is_owner OR t.user_id = v_uid THEN t.recipient_phone
      ELSE CONCAT('+***', RIGHT(t.recipient_phone, 4))
    END AS recipient_phone,
    CASE
      WHEN t.recipient_email IS NULL THEN NULL
      WHEN v_is_owner OR t.user_id = v_uid THEN t.recipient_email
      ELSE CONCAT(LEFT(t.recipient_email, 2), '***@***',
        SUBSTRING(t.recipient_email FROM POSITION('@' IN t.recipient_email)))
    END AS recipient_email,
    t.external_reference, t.metadata, t.created_at, t.updated_at, t.completed_at
  FROM public.transactions t
  WHERE t.business_id = p_business_id
  ORDER BY t.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 500))
  OFFSET GREATEST(0, p_offset);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_transactions_masked(uuid, int, int) TO authenticated;

-- 5. Scope realtime broadcast topics for live streams to the stream owner.
--    Stream topics use the pattern `stream:<owner_user_id>:<stream_id>`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'realtime' AND c.relname = 'messages'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Stream topics scoped to owner" ON realtime.messages';
    EXECUTE $p$
      CREATE POLICY "Stream topics scoped to owner"
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        (realtime.topic() LIKE 'stream:%')
        AND (
          split_part(realtime.topic(), ':', 2) = auth.uid()::text
        )
      )
    $p$;
  END IF;
END $$;
