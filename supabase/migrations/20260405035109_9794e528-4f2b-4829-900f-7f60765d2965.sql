
-- Mental health checkins (daily mood check-in)
CREATE TABLE public.mental_health_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_state TEXT NOT NULL CHECK (mood_state IN ('NGUVU','FURAHA','SAWA','MACHAFUKO','UCHOVU','WASIWASI')),
  mood_score SMALLINT NOT NULL CHECK (mood_score BETWEEN 1 AND 6),
  free_text_response TEXT,
  language_detected TEXT DEFAULT 'sw',
  wellness_tokens_earned SMALLINT DEFAULT 5,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.mental_health_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checkins" ON public.mental_health_checkins FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Journal entries
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_mode TEXT NOT NULL CHECK (entry_mode IN ('BIASHARA_YANGU','MIMI_MWENYEWE','SHUKRANI')),
  prompt_text TEXT NOT NULL,
  content TEXT NOT NULL,
  sentiment_score FLOAT,
  dominant_emotion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON public.journal_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Burnout Risk Scores
CREATE TABLE public.burnout_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brs_value FLOAT NOT NULL CHECK (brs_value BETWEEN 0 AND 100),
  brs_zone TEXT NOT NULL CHECK (brs_zone IN ('GREEN','AMBER','ORANGE','RED')),
  signal_breakdown JSONB DEFAULT '{}',
  recommended_action TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.burnout_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own BRS" ON public.burnout_risk_scores FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Crisis events log
CREATE TABLE public.crisis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('NLP_DETECTION','KEYWORD_MATCH','MANUAL_BUTTON','BRS_RED')),
  trigger_source TEXT,
  crisis_confidence FLOAT DEFAULT 0,
  resources_displayed JSONB,
  follow_up_scheduled_at TIMESTAMPTZ,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  monitoring_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.crisis_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own crisis events" ON public.crisis_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create own crisis events" ON public.crisis_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Wins vault
CREATE TABLE public.wins_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  win_text TEXT NOT NULL,
  win_type TEXT DEFAULT 'GENERAL',
  brs_at_time_of_win FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.wins_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wins" ON public.wins_vault FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Wellness tokens ledger
CREATE TABLE public.wellness_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('EARNED_CHECKIN','EARNED_JOURNAL','EARNED_INTERVENTION','REDEEMED_FEATURE','REDEEMED_PARTNER','REDEEMED_CHARITY')),
  token_amount SMALLINT NOT NULL,
  balance_after SMALLINT NOT NULL DEFAULT 0,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.wellness_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tokens" ON public.wellness_tokens FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
