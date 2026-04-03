import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Lightbulb, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';

const TIPS = [
  "Take a 5-minute walk between tasks to reset your focus.",
  "Practice the 2-minute rule: if it takes less than 2 minutes, do it now.",
  "Set boundaries — it's OK to say no to protect your energy.",
  "Celebrate small wins. Progress, not perfection, matters.",
  "Schedule 'no-meeting' blocks to do deep work without interruptions.",
  "Hydrate! Dehydration can reduce concentration by up to 25%.",
  "Write down 3 things you're grateful for before bed.",
  "Delegate one task today that someone else can handle.",
];

export function MentalHealthWidget() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [journalText, setJournalText] = useState('');
  const [entries, setEntries] = useState<{ date: string; text: string; ai_response?: string }[]>([]);
  const [tipIdx, setTipIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTipIdx(Math.floor(Math.random() * TIPS.length));
    if (!user?.id) return;
    // Load journal entries from DB
    (async () => {
      const { data } = await supabase
        .from('wellness_entries' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_type', 'journal')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data && Array.isArray(data)) {
        setEntries(data.map((d: any) => ({
          date: d.created_at,
          text: d.content || '',
          ai_response: d.ai_response,
        })));
      }
    })();
  }, [user?.id]);

  const saveJournal = async () => {
    if (!journalText.trim() || !user?.id) return;
    setSaving(true);

    let aiMsg: string | null = null;
    try {
      const { data } = await supabase.functions.invoke('wellness-ai-chat', {
        body: { journalText: journalText.trim() },
      });
      if (data?.response) aiMsg = data.response;
    } catch {
      // best-effort AI
    }

    await supabase.from('wellness_entries' as any).insert({
      user_id: user.id,
      business_id: business?.id || null,
      entry_type: 'journal',
      content: journalText.trim(),
      ai_response: aiMsg,
    } as any);

    const entry = { date: new Date().toISOString(), text: journalText.trim(), ai_response: aiMsg || undefined };
    setEntries(prev => [entry, ...prev].slice(0, 50));
    setJournalText('');
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Daily Tip */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Daily Wellness Tip
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setTipIdx((tipIdx - 1 + TIPS.length) % TIPS.length)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <p className="text-sm text-foreground flex-1 text-center italic">"{TIPS[tipIdx]}"</p>
            <Button variant="ghost" size="icon" onClick={() => setTipIdx((tipIdx + 1) % TIPS.length)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Journal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5 text-primary" />
            Quick Journal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="What's on your mind today? Jot down your thoughts..."
            value={journalText}
            onChange={e => setJournalText(e.target.value)}
            rows={3}
            maxLength={2000}
          />
          <Button size="sm" onClick={saveJournal} disabled={!journalText.trim() || saving}>
            {saving ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...</> : 'Save Entry'}
          </Button>

          {entries.length > 0 && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground">Recent entries</p>
              {entries.slice(0, 5).map((e, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 text-sm space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-foreground">{e.text}</p>
                  {e.ai_response && (
                    <div className="p-2 rounded-md bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-xs font-medium text-primary">AI Response</span>
                      </div>
                      <p className="text-xs text-foreground">{e.ai_response}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
