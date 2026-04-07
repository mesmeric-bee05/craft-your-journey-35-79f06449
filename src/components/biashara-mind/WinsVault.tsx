import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trophy, Plus, Sparkles } from 'lucide-react';
import { useBiasharaMind } from '@/hooks/useBiasharaMind';
import { format } from 'date-fns';

const WIN_TYPES = [
  { value: 'revenue', label: '💰 Revenue', color: 'bg-green-500/10 text-green-700 dark:text-green-300' },
  { value: 'customer', label: '🤝 Customer', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  { value: 'personal', label: '🌱 Personal', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' },
  { value: 'milestone', label: '🎯 Milestone', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
];

export function WinsVault() {
  const { wins, addWin } = useBiasharaMind();
  const [winText, setWinText] = useState('');
  const [winType, setWinType] = useState('milestone');
  const [showInput, setShowInput] = useState(false);

  const handleAdd = async () => {
    if (!winText.trim()) return;
    await addWin.mutateAsync({ win_text: winText.trim(), win_type: winType });
    setWinText('');
    setShowInput(false);
  };

  const randomWin = wins.length > 0 ? (wins as any[])[Math.floor(Math.random() * wins.length)] : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Wins Vault
          </CardTitle>
          <Badge variant="secondary">{wins.length} wins</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Rekodi ushindi wako — celebrate every progress.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Random win recall */}
        {randomWin && !showInput && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 border border-amber-200/50 dark:border-amber-800/30">
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 mb-1">
              <Sparkles className="w-3 h-3" />
              Kumbuka siku njema
            </div>
            <p className="text-sm font-medium text-foreground">"{randomWin.win_text}"</p>
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(randomWin.created_at), 'MMMM d, yyyy')}</p>
          </div>
        )}

        {showInput ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {WIN_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setWinType(t.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    winType === t.value ? t.color + ' ring-2 ring-primary/30' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="What win do you want to remember?"
                value={winText}
                onChange={(e) => setWinText(e.target.value)}
                maxLength={300}
                className="rounded-xl"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <Button onClick={handleAdd} disabled={addWin.isPending} size="sm">
                {addWin.isPending ? '...' : 'Save'}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowInput(true)} className="w-full gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Record a Win
          </Button>
        )}

        {/* Timeline list */}
        <div className="relative space-y-0 max-h-72 overflow-y-auto">
          {(wins as any[]).slice(0, 15).map((w, i) => {
            const typeInfo = WIN_TYPES.find(t => t.value === w.win_type);
            return (
              <div key={w.id} className="flex gap-3 group">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-background flex-shrink-0 mt-2 group-hover:scale-125 transition-transform" />
                  {i < Math.min(wins.length, 15) - 1 && (
                    <div className="w-0.5 flex-1 bg-border min-h-[2rem]" />
                  )}
                </div>
                <div className="flex-1 pb-4 min-w-0">
                  <p className="text-sm text-foreground">{w.win_text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{format(new Date(w.created_at), 'MMM d, yyyy')}</span>
                    {typeInfo && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
