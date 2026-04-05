import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Flame, Lock } from 'lucide-react';
import { useBiasharaMind, MOOD_CONFIG, type MoodState } from '@/hooks/useBiasharaMind';
import { cn } from '@/lib/utils';

const DAILY_QUESTIONS = [
  'Ni nini kinachokuingia akilini zaidi asubuhi hii?',
  'What one thing would make today a good day for your business?',
  'Kuna kitu kinachokusumbua usiku?',
  'What small thing are you proud of from yesterday?',
  'Je, umeshukuru mtu yeyote wiki hii?',
  'Unajisikiaje kuhusu biashara yako leo?',
];

export function DailyCheckin() {
  const { submitCheckin, todayCheckin, streak } = useBiasharaMind();
  const [selected, setSelected] = useState<MoodState | null>(null);
  const [freeText, setFreeText] = useState('');
  const [submitted, setSubmitted] = useState(!!todayCheckin);

  const question = DAILY_QUESTIONS[new Date().getDay() % DAILY_QUESTIONS.length];

  const handleSubmit = async () => {
    if (!selected) return;
    const config = MOOD_CONFIG[selected];
    await submitCheckin.mutateAsync({
      mood_state: selected,
      mood_score: config.score,
      free_text_response: freeText || undefined,
    });
    setSubmitted(true);
  };

  if (submitted || todayCheckin) {
    const mood = todayCheckin?.mood_state as MoodState || selected;
    const config = mood ? MOOD_CONFIG[mood] : null;
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-amber-50/50 to-green-50/30 dark:from-amber-950/20 dark:to-green-950/10">
        <CardContent className="py-6 text-center space-y-3">
          <div className="text-4xl">{config?.emoji || '✅'}</div>
          <p className="text-lg font-medium text-foreground">
            Asante! Umejisajili leo 💛
          </p>
          <p className="text-sm text-muted-foreground">
            Unahisi: <span className="font-semibold">{config?.swahili}</span> — {config?.label}
          </p>
          {streak > 1 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="w-3 h-3 text-orange-500" />
              {streak}-day streak!
              {streak >= 90 ? ' 🏆 Mzee' : streak >= 30 ? ' 🌟 Kiongozi' : streak >= 7 ? ' 💪 Msimamizi' : ''}
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display">
            Habari za asubuhi! Unajisikiaje leo? 🌅
          </CardTitle>
          {streak > 0 && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Flame className="w-3 h-3 text-orange-500" /> {streak}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Lock className="w-3 h-3" /> Maneno yako yanabaki yako
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mood selection */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(Object.entries(MOOD_CONFIG) as [MoodState, typeof MOOD_CONFIG[MoodState]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setSelected(key)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all duration-300',
                selected === key
                  ? 'border-primary bg-primary/10 scale-105 shadow-md'
                  : 'border-transparent bg-background/60 hover:bg-background hover:scale-[1.03]'
              )}
            >
              <span className="text-2xl">{cfg.emoji}</span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{cfg.swahili}</span>
            </button>
          ))}
        </div>

        {/* Follow-up question */}
        {selected && (
          <div className="space-y-2 animate-fade-in">
            <p className="text-sm text-foreground font-medium italic">"{question}"</p>
            <Textarea
              placeholder="Andika hapa... (optional)"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value.slice(0, 200))}
              className="resize-none rounded-xl bg-background/80"
              rows={2}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{freeText.length}/200</span>
              <Button
                onClick={handleSubmit}
                disabled={submitCheckin.isPending}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                {submitCheckin.isPending ? 'Saving...' : 'Check In ✨'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
