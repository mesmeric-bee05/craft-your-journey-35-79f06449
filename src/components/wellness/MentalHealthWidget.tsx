import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [journalText, setJournalText] = useState('');
  const [entries, setEntries] = useState<{ date: string; text: string }[]>([]);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('wellness_journal');
    if (saved) setEntries(JSON.parse(saved));
    setTipIdx(Math.floor(Math.random() * TIPS.length));
  }, []);

  const saveJournal = () => {
    if (!journalText.trim()) return;
    const entry = { date: new Date().toISOString(), text: journalText.trim() };
    const updated = [entry, ...entries].slice(0, 50);
    setEntries(updated);
    localStorage.setItem('wellness_journal', JSON.stringify(updated));
    setJournalText('');
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
          />
          <Button size="sm" onClick={saveJournal} disabled={!journalText.trim()}>
            Save Entry
          </Button>

          {entries.length > 0 && (
            <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground">Recent entries</p>
              {entries.slice(0, 5).map((e, i) => (
                <div key={i} className="p-2 rounded-lg bg-muted/50 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">
                    {new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-foreground">{e.text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
