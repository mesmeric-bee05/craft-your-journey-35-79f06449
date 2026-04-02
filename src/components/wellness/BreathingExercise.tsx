import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wind, Play, Pause } from 'lucide-react';

type Phase = 'inhale' | 'hold' | 'exhale' | 'idle';
const PHASES: { phase: Phase; duration: number; label: string }[] = [
  { phase: 'inhale', duration: 4, label: 'Breathe In' },
  { phase: 'hold', duration: 7, label: 'Hold' },
  { phase: 'exhale', duration: 8, label: 'Breathe Out' },
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

  const scale = phase === 'inhale' ? 1.3 : phase === 'exhale' ? 0.8 : 1;
  const currentLabel = PHASES.find(p => p.phase === phase)?.label || 'Ready?';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wind className="w-5 h-5 text-primary" />
          4-7-8 Breathing
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div
          className="w-32 h-32 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center transition-transform duration-1000 ease-in-out"
          style={{ transform: `scale(${scale})` }}
        >
          <div className="text-center">
            <p className="text-sm font-medium text-primary">{currentLabel}</p>
            {active && <p className="text-2xl font-bold text-foreground">{seconds}</p>}
          </div>
        </div>
        {cycle > 0 && <p className="text-xs text-muted-foreground">Cycle {cycle}</p>}
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
