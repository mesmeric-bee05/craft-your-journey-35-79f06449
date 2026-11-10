-- SmartReach Telegram integration foundation
-- Secrets remain in Supabase Edge Function secrets; never store bot tokens in this schema.

CREATE TABLE IF NOT EXISTS public.telegram_update_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id BIGINT NOT NULL UNIQUE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.social_channels(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed')),
  error_code TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  raw_update JSONB NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.telegram_update_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.telegram_update_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.telegram_update_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_telegram_update_events_business
  ON public.telegram_update_events (business_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_update_events_channel
  ON public.telegram_update_events (channel_id, received_at DESC);

COMMENT ON TABLE public.telegram_update_events IS
  'Server-only Telegram update ledger for replay protection and operational auditability.';
