import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useBiasharaMind, MOOD_CONFIG } from '@/hooks/useBiasharaMind';
import { cn } from '@/lib/utils';

const ZONE_CONFIG = {
  GREEN:  { label: 'Unastawi', desc: 'You are thriving', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500', ring: 'ring-green-500/30' },
  AMBER:  { label: 'Angalia', desc: 'Watch yourself', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500', ring: 'ring-amber-500/30' },
  ORANGE: { label: 'Pumzika', desc: 'Rest needed', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', ring: 'ring-orange-500/30' },
  RED:    { label: 'Hatua ya haraka', desc: 'Urgent care needed', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', ring: 'ring-red-500/30' },
};

function computeBRSFromCheckins(checkins: any[]): { value: number; zone: string } {
  if (!checkins.length) return { value: 25, zone: 'GREEN' };
  const recent = checkins.slice(0, 14);
  const avgScore = recent.reduce((s: number, c: any) => s + (c.mood_score || 4), 0) / recent.length;
  // Map 1-6 mood score to 0-100 BRS (inverted: high mood = low burnout)
  const brs = Math.max(0, Math.min(100, Math.round((1 - (avgScore - 1) / 5) * 100)));
  const zone = brs <= 35 ? 'GREEN' : brs <= 60 ? 'AMBER' : brs <= 80 ? 'ORANGE' : 'RED';
  return { value: brs, zone };
}

export function BurnoutGauge() {
  const { latestBRS, checkins } = useBiasharaMind();
  
  const brs = latestBRS || computeBRSFromCheckins(checkins);
  const zone = ZONE_CONFIG[(brs as any).brs_zone || (brs as any).zone || 'GREEN'] || ZONE_CONFIG.GREEN;
  const value = (brs as any).brs_value ?? (brs as any).value ?? 25;

  // SVG gauge
  const radius = 60;
  const circumference = Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <Card className={cn('ring-2', zone.ring)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display">Burnout Risk Score</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3 pb-6">
        <div className="relative w-36 h-20">
          <svg viewBox="0 0 140 80" className="w-full h-full">
            <path
              d="M 10 75 A 60 60 0 0 1 130 75"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className="text-muted/20"
              strokeLinecap="round"
            />
            <path
              d="M 10 75 A 60 60 0 0 1 130 75"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              className={zone.color}
              strokeLinecap="round"
              strokeDasharray={`${circumference}`}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <span className={cn('text-2xl font-bold', zone.color)}>{zone.label}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-48">
          {zone.desc === 'You are thriving'
            ? 'Mwili wako na akili yako viko sawa. Endelea hivyo! 💚'
            : zone.desc === 'Watch yourself'
            ? 'Angalia pumziko lako wiki hii. Haraka haraka haina baraka.'
            : zone.desc === 'Rest needed'
            ? 'Mwili wako na akili yako vinaomba pumziko kidogo.'
            : 'Tafadhali wasiliana na msaada. Uko muhimu sana. 💛'}
        </p>
      </CardContent>
    </Card>
  );
}
