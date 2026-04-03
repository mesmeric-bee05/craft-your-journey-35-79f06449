import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smile, Meh, Frown, Heart, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';

const MOODS = [
  { key: 'great', label: 'Great', icon: Heart, color: 'text-green-500', value: 5 },
  { key: 'good', label: 'Good', icon: Smile, color: 'text-emerald-400', value: 4 },
  { key: 'neutral', label: 'Neutral', icon: Meh, color: 'text-yellow-400', value: 3 },
  { key: 'low', label: 'Low', icon: Frown, color: 'text-orange-400', value: 2 },
  { key: 'stressed', label: 'Stressed', icon: AlertTriangle, color: 'text-red-400', value: 1 },
] as const;

interface MoodEntry {
  date: string;
  mood: string;
  value: number;
  ai_response?: string;
}

export function MoodTracker() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Load from DB
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('wellness_entries' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_type', 'mood')
        .order('created_at', { ascending: false })
        .limit(30);
      if (data && Array.isArray(data)) {
        const mapped = data.map((d: any) => ({
          date: format(new Date(d.created_at), 'yyyy-MM-dd'),
          mood: d.mood || '',
          value: d.mood_value || 3,
          ai_response: d.ai_response,
        }));
        setEntries(mapped);
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayEntry = mapped.find(e => e.date === today);
        if (todayEntry) {
          setTodayMood(todayEntry.mood);
          if (todayEntry.ai_response) setAiResponse(todayEntry.ai_response);
        }
      }
    })();
  }, [user?.id]);

  const fetchAiResponse = useCallback(async (moodKey: string) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('wellness-ai-chat', {
        body: { mood: moodKey },
      });
      if (!error && data?.response) {
        setAiResponse(data.response);
        return data.response;
      }
    } catch {
      // fallback
    } finally {
      setAiLoading(false);
    }
    return null;
  }, []);

  const logMood = async (moodKey: string, value: number) => {
    if (!user?.id) return;
    setTodayMood(moodKey);

    // Get AI response
    const aiMsg = await fetchAiResponse(moodKey);

    // Save to DB
    await supabase.from('wellness_entries' as any).insert({
      user_id: user.id,
      business_id: business?.id || null,
      entry_type: 'mood',
      mood: moodKey,
      mood_value: value,
      ai_response: aiMsg || null,
    } as any);

    // Update local state
    const today = format(new Date(), 'yyyy-MM-dd');
    setEntries(prev => {
      const filtered = prev.filter(e => e.date !== today);
      return [{ date: today, mood: moodKey, value, ai_response: aiMsg || undefined }, ...filtered];
    });
  };

  const streak = (() => {
    let count = 0;
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = format(new Date(today.getTime() - i * 86400000), 'yyyy-MM-dd');
      if (sorted.find(e => e.date === d)) count++;
      else break;
    }
    return count;
  })();

  const chartData = entries
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(e => ({ date: format(new Date(e.date), 'MMM dd'), value: e.value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="w-5 h-5 text-primary" />
          Daily Mood Check-in
          {streak > 1 && (
            <span className="ml-auto text-xs font-normal bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              🔥 {streak}-day streak
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-3">How are you feeling today?</p>
          <div className="flex gap-2 flex-wrap">
            {MOODS.map(m => (
              <Button
                key={m.key}
                variant={todayMood === m.key ? 'default' : 'outline'}
                size="sm"
                className="gap-1.5"
                onClick={() => logMood(m.key, m.value)}
                disabled={aiLoading}
              >
                <m.icon className={`w-4 h-4 ${todayMood === m.key ? '' : m.color}`} />
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        {/* AI Response */}
        {(aiLoading || aiResponse) && (
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Wellness AI</span>
            </div>
            {aiLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Reflecting on your mood...
              </div>
            ) : (
              <p className="text-sm text-foreground">{aiResponse}</p>
            )}
          </div>
        )}

        {chartData.length > 2 && (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#moodGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
