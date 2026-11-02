-- Webhook hardening: durable event deduplication and atomic payment settlement.
-- These tables are service-role-only; ordinary client roles have no access.

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('mpesa', 'stripe')),
  event_id text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  UNIQUE (provider, event_id)
);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payment_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.payment_webhook_events TO service_role;

CREATE TABLE IF NOT EXISTS public.support_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text
);

ALTER TABLE public.support_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.support_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.support_webhook_events TO service_role;

CREATE OR REPLACE FUNCTION public.apply_payment_webhook(
  p_provider text,
  p_event_id text,
  p_transaction_reference text,
  p_status text,
  p_external_reference text DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_tx public.transactions%ROWTYPE;
  v_previous_status text;
  v_amount numeric;
BEGIN
  IF p_provider NOT IN ('mpesa', 'stripe') THEN
    RAISE EXCEPTION 'Unsupported payment provider';
  END IF;
  IF p_status NOT IN ('completed', 'failed', 'pending') THEN
    RAISE EXCEPTION 'Unsupported payment status';
  END IF;
  IF nullif(trim(p_event_id), '') IS NULL OR nullif(trim(p_transaction_reference), '') IS NULL THEN
    RAISE EXCEPTION 'Webhook event and transaction reference are required';
  END IF;

  INSERT INTO public.payment_webhook_events(provider, event_id, payload)
  VALUES (p_provider, p_event_id, coalesce(p_payload, '{}'::jsonb))
  ON CONFLICT (provider, event_id) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('accepted', true, 'duplicate', true);
  END IF;

  SELECT * INTO v_tx
  FROM public.transactions
  WHERE reference = p_transaction_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    UPDATE public.payment_webhook_events
    SET status = 'failed', error = 'transaction_not_found', processed_at = now()
    WHERE id = v_event_id;
    RETURN jsonb_build_object('accepted', false, 'error', 'transaction_not_found');
  END IF;

  v_previous_status := v_tx.status::text;
  IF v_tx.status::text IN ('completed', 'failed') THEN
    UPDATE public.payment_webhook_events
    SET status = 'processed', error = 'transaction_already_final', processed_at = now()
    WHERE id = v_event_id;
    RETURN jsonb_build_object(
      'accepted', true,
      'duplicate', true,
      'transaction_id', v_tx.id,
      'business_id', v_tx.business_id,
      'user_id', v_tx.user_id,
      'type', v_tx.type,
      'currency', v_tx.currency,
      'amount', v_tx.amount,
      'status', v_tx.status
    );
  END IF;

  v_amount := coalesce(p_amount, v_tx.amount);
  UPDATE public.transactions
  SET status = p_status,
      external_reference = coalesce(p_external_reference, external_reference),
      completed_at = CASE WHEN p_status = 'completed' THEN now() ELSE NULL END,
      metadata = coalesce(v_tx.metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb)
                 || jsonb_build_object('webhook_event_id', p_event_id, 'webhook_provider', p_provider),
      updated_at = now()
  WHERE id = v_tx.id;

  IF p_status = 'completed' AND v_tx.type::text = 'deposit' AND v_tx.wallet_id IS NOT NULL THEN
    PERFORM public.wallet_credit(v_tx.wallet_id, v_amount);
  END IF;

  UPDATE public.payment_webhook_events
  SET status = 'processed', processed_at = now()
  WHERE id = v_event_id;

  RETURN jsonb_build_object(
    'accepted', true,
    'duplicate', false,
    'transaction_id', v_tx.id,
    'business_id', v_tx.business_id,
    'user_id', v_tx.user_id,
    'type', v_tx.type,
    'currency', v_tx.currency,
    'amount', v_amount,
    'previous_status', v_previous_status,
    'status', p_status
  );
EXCEPTION WHEN OTHERS THEN
  IF v_event_id IS NOT NULL THEN
    UPDATE public.payment_webhook_events
    SET status = 'failed', error = SQLERRM, processed_at = now()
    WHERE id = v_event_id;
  END IF;
  RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_payment_webhook(text, text, text, text, text, numeric, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment_webhook(text, text, text, text, text, numeric, jsonb, jsonb) TO service_role;
