import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Smile, Meh, Frown, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const MOOD_MAP: Record<string, { icon: typeof Heart; label: string; color: string }> = {
  great: { icon: Heart, label: 'Great', color: 'text-green-500' },
  good: { icon: Smile, label: 'Good', color: 'text-emerald-400' },
  neutral: { icon: Meh, label: 'Neutral', color: 'text-yellow-400' },
  low: { icon: Frown, label: 'Low', color: 'text-orange-400' },
  stressed: { icon: AlertTriangle, label: 'Stressed', color: 'text-red-400' },
};

export function WellnessScoreCard() {
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('wellness_mood_entries');
    if (!saved) return;
    const entries: { date: string; mood: string }[] = JSON.parse(saved);
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayEntry = entries.find(e => e.date === today);
    if (todayEntry) setTodayMood(todayEntry.mood);

    let count = 0;
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const d = format(new Date(now.getTime() - i * 86400000), 'yyyy-MM-dd');
      if (sorted.find(e => e.date === d)) count++;
      else break;
    }
    setStreak(count);
  }, []);

  const mood = todayMood ? MOOD_MAP[todayMood] : null;
  const MoodIcon = mood?.icon || Heart;

  return (
    <Link to="/wellness">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ${mood?.color || 'text-primary'}`}>
            <MoodIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Wellness</p>
            <p className="text-xs text-muted-foreground">
              {mood ? `Feeling ${mood.label}` : 'Check in today'}
              {streak > 1 && ` · ${streak}-day streak 🔥`}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
