import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trophy, Plus, Sparkles } from 'lucide-react';
import { useBiasharaMind } from '@/hooks/useBiasharaMind';
import { format } from 'date-fns';

export function WinsVault() {
  const { wins, addWin } = useBiasharaMind();
  const [winText, setWinText] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAdd = async () => {
    if (!winText.trim()) return;
    await addWin.mutateAsync({ win_text: winText.trim() });
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
          <div className="flex gap-2">
            <Input
              placeholder="What win do you want to remember?"
              value={winText}
              onChange={(e) => setWinText(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={addWin.isPending} size="sm">
              {addWin.isPending ? '...' : 'Save'}
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowInput(true)} className="w-full gap-2 rounded-xl">
            <Plus className="w-4 h-4" /> Record a Win
          </Button>
        )}

        {/* Win list */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {(wins as any[]).slice(0, 10).map((w) => (
            <div key={w.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <span className="text-lg mt-0.5">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{w.win_text}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(w.created_at), 'MMM d, yyyy')}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
