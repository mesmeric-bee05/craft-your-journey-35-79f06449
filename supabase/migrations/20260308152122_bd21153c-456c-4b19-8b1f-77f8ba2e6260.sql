CREATE INDEX IF NOT EXISTS idx_conversations_business_status ON public.conversations (business_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_business_last_contact ON public.customers (business_id, last_contact_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_business_status_type ON public.transactions (business_id, status, type);
CREATE INDEX IF NOT EXISTS idx_notifications_business_created ON public.notifications (business_id, created_at DESC);