import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smile, Meh, Frown, Heart, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

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
  note?: string;
}

export function MoodTracker() {
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [todayMood, setTodayMood] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('wellness_mood_entries');
    if (saved) {
      const parsed: MoodEntry[] = JSON.parse(saved);
      setEntries(parsed);
      const today = format(new Date(), 'yyyy-MM-dd');
      const todayEntry = parsed.find(e => e.date === today);
      if (todayEntry) setTodayMood(todayEntry.mood);
    }
  }, []);

  const logMood = (moodKey: string, value: number) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const newEntry: MoodEntry = { date: today, mood: moodKey, value };
    const updated = [...entries.filter(e => e.date !== today), newEntry].slice(-30);
    setEntries(updated);
    setTodayMood(moodKey);
    localStorage.setItem('wellness_mood_entries', JSON.stringify(updated));
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
              >
                <m.icon className={`w-4 h-4 ${todayMood === m.key ? '' : m.color}`} />
                {m.label}
              </Button>
            ))}
          </div>
        </div>

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
