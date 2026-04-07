import { Card, CardContent } from '@/components/ui/card';
import { Heart, Smile, Meh, Frown, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBiasharaMind, MOOD_CONFIG, type MoodState } from '@/hooks/useBiasharaMind';

const MOOD_ICON_MAP: Record<string, { icon: typeof Heart; color: string }> = {
  NGUVU:     { icon: Heart, color: 'text-orange-500' },
  FURAHA:    { icon: Smile, color: 'text-yellow-500' },
  SAWA:     { icon: Meh, color: 'text-blue-400' },
  MACHAFUKO: { icon: Frown, color: 'text-gray-400' },
  UCHOVU:   { icon: Frown, color: 'text-purple-400' },
  WASIWASI: { icon: AlertTriangle, color: 'text-red-400' },
};

export function WellnessScoreCard() {
  const { todayCheckin, streak } = useBiasharaMind();

  const moodState = (todayCheckin as any)?.mood_state as MoodState | undefined;
  const moodCfg = moodState ? MOOD_CONFIG[moodState] : null;
  const iconCfg = moodState ? MOOD_ICON_MAP[moodState] : null;
  const MoodIcon = iconCfg?.icon || Heart;

  return (
    <Link to="/wellness">
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center ${iconCfg?.color || 'text-primary'}`}>
            <MoodIcon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Biashara Mind™</p>
            <p className="text-xs text-muted-foreground">
              {moodCfg ? `${moodCfg.emoji} ${moodCfg.label}` : 'Check in today'}
              {streak > 1 && ` · ${streak}-day streak 🔥`}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
