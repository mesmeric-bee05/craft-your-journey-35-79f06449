
CREATE TABLE IF NOT EXISTS public.capital_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES public.capital_partners(id) ON DELETE SET NULL,
  event text NOT NULL,
  advance_id uuid,
  headers jsonb NOT NULL DEFAULT '{}'::jsonb,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,
  sig_valid boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'received',
  error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.capital_webhook_events TO authenticated;
GRANT ALL ON public.capital_webhook_events TO service_role;

ALTER TABLE public.capital_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read webhook events"
  ON public.capital_webhook_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_capital_webhook_events_created_at
  ON public.capital_webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capital_webhook_events_status
  ON public.capital_webhook_events (status);
CREATE INDEX IF NOT EXISTS idx_capital_webhook_events_partner
  ON public.capital_webhook_events (partner_id);
