import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBiasharaMind, MOOD_CONFIG } from '@/hooks/useBiasharaMind';
import { cn } from '@/lib/utils';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function scoreToColor(score: number): string {
  if (score >= 5) return 'bg-green-500';
  if (score >= 4) return 'bg-blue-400';
  if (score >= 3) return 'bg-amber-400';
  if (score >= 2) return 'bg-orange-500';
  return 'bg-red-500';
}

export function MoodHeatmap() {
  const { checkins } = useBiasharaMind();

  // Build 4-week grid
  const weeks: (number | null)[][] = [];
  const today = new Date();
  for (let w = 3; w >= 0; w--) {
    const week: (number | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));
      const dateStr = date.toDateString();
      const checkin = (checkins as any[]).find((c) => new Date(c.checked_in_at).toDateString() === dateStr);
      week.push(checkin ? checkin.mood_score : null);
    }
    weeks.push(week);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display">Mood Pattern (4 Weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((d) => (
              <span key={d} className="text-[10px] text-center text-muted-foreground">{d}</span>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((score, di) => (
                <div
                  key={di}
                  className={cn(
                    'w-full aspect-square rounded-sm transition-all',
                    score !== null ? scoreToColor(score) : 'bg-muted/30'
                  )}
                  title={score !== null ? `Score: ${score}/6` : 'No check-in'}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 justify-center">
          <span className="text-[10px] text-muted-foreground">Low</span>
          <div className="flex gap-0.5">
            {['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-blue-400', 'bg-green-500'].map((c) => (
              <div key={c} className={cn('w-3 h-3 rounded-sm', c)} />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">High</span>
        </div>
      </CardContent>
    </Card>
  );
}
