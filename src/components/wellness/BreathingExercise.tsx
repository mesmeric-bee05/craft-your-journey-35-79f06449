import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wind, Play, Pause } from 'lucide-react';

type Phase = 'inhale' | 'hold' | 'exhale' | 'idle';
const PHASES: { phase: Phase; duration: number; label: string; swahili: string }[] = [
  { phase: 'inhale', duration: 4, label: 'Breathe In', swahili: 'Vuta pumzi' },
  { phase: 'hold', duration: 7, label: 'Hold', swahili: 'Shika' },
  { phase: 'exhale', duration: 8, label: 'Breathe Out', swahili: 'Toa pumzi' },
];

export function BreathingExercise() {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [cycle, setCycle] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!active) return;
    let phaseIdx = 0;
    let remaining = PHASES[0].duration;
    setPhase(PHASES[0].phase);
    setSeconds(remaining);

    intervalRef.current = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        phaseIdx = (phaseIdx + 1) % PHASES.length;
        if (phaseIdx === 0) setCycle(c => c + 1);
        remaining = PHASES[phaseIdx].duration;
        setPhase(PHASES[phaseIdx].phase);
      }
      setSeconds(remaining);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [active]);

  const stop = () => {
    setActive(false);
    clearInterval(intervalRef.current);
    setPhase('idle');
    setSeconds(0);
    setCycle(0);
  };

  const scale = phase === 'inhale' ? 1.35 : phase === 'exhale' ? 0.75 : 1;
  const phaseInfo = PHASES.find(p => p.phase === phase);
  const currentLabel = phaseInfo?.label || 'Ready?';
  const currentSwahili = phaseInfo?.swahili || 'Uko tayari?';

  // Ring progress for the current phase
  const maxDuration = phaseInfo?.duration || 1;
  const progress = active ? (maxDuration - seconds) / maxDuration : 0;
  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - progress * ringCircumference;

  const phaseColor = phase === 'inhale' 
    ? 'text-blue-400' 
    : phase === 'hold' 
    ? 'text-amber-400' 
    : phase === 'exhale' 
    ? 'text-emerald-400' 
    : 'text-primary';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wind className="w-5 h-5 text-primary" />
          4-7-8 Breathing
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {/* Guided circle with SVG ring */}
        <div className="relative w-36 h-36">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={ringRadius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
            {active && (
              <circle
                cx="60" cy="60" r={ringRadius}
                fill="none" stroke="currentColor" strokeWidth="4"
                className={phaseColor}
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            )}
          </svg>
          <div
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center transition-transform duration-[1500ms] ease-in-out"
              style={{ transform: `scale(${scale})` }}
            >
              <div className="text-center">
                <p className={`text-xs font-medium ${phaseColor}`}>{currentSwahili}</p>
                <p className="text-sm font-semibold text-foreground">{currentLabel}</p>
                {active && <p className="text-2xl font-bold text-foreground">{seconds}</p>}
              </div>
            </div>
          </div>
        </div>

        {cycle > 0 && (
          <p className="text-xs text-muted-foreground">
            Cycle {cycle} {cycle >= 3 && '— Hongera! Great session 💛'}
          </p>
        )}
        <Button
          variant={active ? 'outline' : 'default'}
          size="sm"
          className="gap-2"
          onClick={active ? stop : () => setActive(true)}
        >
          {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {active ? 'Stop' : 'Start Exercise'}
        </Button>
      </CardContent>
    </Card>
  );
}
