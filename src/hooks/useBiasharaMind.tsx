import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type MoodState = 'NGUVU' | 'FURAHA' | 'SAWA' | 'MACHAFUKO' | 'UCHOVU' | 'WASIWASI';

export const MOOD_CONFIG: Record<MoodState, { label: string; swahili: string; emoji: string; color: string; score: number }> = {
  NGUVU:      { label: 'Energetic', swahili: 'Nguvu',      emoji: '💪', color: 'hsl(25, 95%, 53%)',  score: 6 },
  FURAHA:     { label: 'Happy',     swahili: 'Furaha',     emoji: '😊', color: 'hsl(48, 96%, 53%)',  score: 5 },
  SAWA:       { label: 'Okay',      swahili: 'Sawa',       emoji: '😌', color: 'hsl(210, 79%, 55%)', score: 4 },
  MACHAFUKO:  { label: 'Overwhelmed', swahili: 'Machafuko', emoji: '😰', color: 'hsl(215, 14%, 55%)', score: 3 },
  UCHOVU:     { label: 'Exhausted', swahili: 'Uchovu',     emoji: '😩', color: 'hsl(270, 50%, 55%)', score: 2 },
  WASIWASI:   { label: 'Anxious',   swahili: 'Wasiwasi',   emoji: '😟', color: 'hsl(0, 72%, 50%)',   score: 1 },
};

export const JOURNAL_MODES = {
  BIASHARA_YANGU: { label: 'Biashara Yangu', description: 'Business decisions, pressures & wins', icon: '💼' },
  MIMI_MWENYEWE:  { label: 'Mimi Mwenyewe', description: 'Identity, purpose & personal wellbeing', icon: '🌱' },
  SHUKRANI:       { label: 'Shukrani', description: 'Gratitude practice', icon: '🙏' },
} as const;

const JOURNAL_PROMPTS: Record<string, string[]> = {
  BIASHARA_YANGU: [
    'Ulifanya uamuzi mgumu wiki hii. Unahisi nini sasa?',
    'What business win, however small, made you smile this week?',
    'Nini kinachokusumbua zaidi kuhusu biashara yako sasa hivi?',
    'If you could change one thing about your work routine, what would it be?',
  ],
  MIMI_MWENYEWE: [
    'Nje ya biashara yako, unastawi katika nini?',
    'When was the last time you did something purely for yourself?',
    'What gives you energy outside of work?',
    'Unahisi nini kuhusu maisha yako kwa ujumla leo?',
  ],
  SHUKRANI: [
    'Name one customer interaction that brought you joy this week.',
    'Taja kitu kimoja ambacho unashukuru nacho leo.',
    'What small blessing did you notice today that you usually overlook?',
    'Who in your life deserves a thank you that you haven\'t given yet?',
  ],
};

export function getRandomPrompt(mode: string): string {
  const prompts = JOURNAL_PROMPTS[mode] || JOURNAL_PROMPTS.BIASHARA_YANGU;
  return prompts[Math.floor(Math.random() * prompts.length)];
}

export function useBiasharaMind() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // Check-ins
  const { data: checkins = [], isLoading: checkinsLoading } = useQuery({
    queryKey: ['mental-health-checkins', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mental_health_checkins' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('checked_in_at', { ascending: false })
        .limit(90);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const submitCheckin = useMutation({
    mutationFn: async (input: { mood_state: MoodState; mood_score: number; free_text_response?: string }) => {
      const { error } = await supabase
        .from('mental_health_checkins' as any)
        .insert({ ...input, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mental-health-checkins'] });
      toast.success('Check-in saved! Asante sana 💛');
    },
    onError: () => toast.error('Failed to save check-in'),
  });

  // Journal entries
  const { data: journalEntries = [], isLoading: journalLoading } = useQuery({
    queryKey: ['journal-entries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journal_entries' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const submitJournal = useMutation({
    mutationFn: async (input: { entry_mode: string; prompt_text: string; content: string }) => {
      const { error } = await supabase
        .from('journal_entries' as any)
        .insert({ ...input, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry saved! Maneno yako yanabaki yako 🔒');
    },
    onError: () => toast.error('Failed to save journal entry'),
  });

  // Wins vault
  const { data: wins = [], isLoading: winsLoading } = useQuery({
    queryKey: ['wins-vault', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wins_vault' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const addWin = useMutation({
    mutationFn: async (input: { win_text: string; win_type?: string }) => {
      const { error } = await supabase
        .from('wins_vault' as any)
        .insert({ ...input, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wins-vault'] });
      toast.success('Win recorded! Hongera! 🎉');
    },
    onError: () => toast.error('Failed to record win'),
  });

  // BRS
  const { data: latestBRS } = useQuery({
    queryKey: ['burnout-risk-score', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('burnout_risk_scores' as any)
        .select('*')
        .eq('user_id', user!.id)
        .order('calculated_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!user?.id,
  });

  // Wellness tokens
  const { data: tokenBalance = 0 } = useQuery({
    queryKey: ['wellness-tokens', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wellness_tokens' as any)
        .select('balance_after')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0]?.balance_after || 0;
    },
    enabled: !!user?.id,
  });

  // Compute streak from checkins
  const streak = (() => {
    if (!checkins.length) return 0;
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < checkins.length; i++) {
      const d = new Date((checkins[i] as any).checked_in_at);
      d.setHours(0, 0, 0, 0);
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (d.getTime() === expected.getTime()) {
        count++;
      } else break;
    }
    return count;
  })();

  // Today's check-in
  const todayCheckin = (() => {
    if (!checkins.length) return null;
    const today = new Date().toDateString();
    const first = checkins[0] as any;
    return new Date(first.checked_in_at).toDateString() === today ? first : null;
  })();

  return {
    checkins, checkinsLoading, submitCheckin, todayCheckin, streak,
    journalEntries, journalLoading, submitJournal,
    wins, winsLoading, addWin,
    latestBRS, tokenBalance,
  };
}
