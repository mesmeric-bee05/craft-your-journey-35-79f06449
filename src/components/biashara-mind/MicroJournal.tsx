import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Lock, BookOpen } from 'lucide-react';
import { useBiasharaMind, JOURNAL_MODES, getRandomPrompt } from '@/hooks/useBiasharaMind';
import { format } from 'date-fns';

export function MicroJournal() {
  const { journalEntries, submitJournal } = useBiasharaMind();
  const [mode, setMode] = useState<string>('BIASHARA_YANGU');
  const [prompt, setPrompt] = useState(getRandomPrompt('BIASHARA_YANGU'));
  const [content, setContent] = useState('');

  const handleModeChange = (m: string) => {
    setMode(m);
    setPrompt(getRandomPrompt(m));
    setContent('');
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await submitJournal.mutateAsync({
      entry_mode: mode,
      prompt_text: prompt,
      content: content.trim(),
    });
    setContent('');
    setPrompt(getRandomPrompt(mode));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Micro-Journal
          </CardTitle>
          <Badge variant="outline" className="gap-1 text-xs">
            <Lock className="w-3 h-3" /> Maneno yako yanabaki yako 🔒
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={handleModeChange}>
          <TabsList className="grid grid-cols-3">
            {Object.entries(JOURNAL_MODES).map(([key, cfg]) => (
              <TabsTrigger key={key} value={key} className="text-xs gap-1">
                <span>{cfg.icon}</span> {cfg.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(JOURNAL_MODES).map(([key, cfg]) => (
            <TabsContent key={key} value={key}>
              <p className="text-xs text-muted-foreground mb-2">{cfg.description}</p>
            </TabsContent>
          ))}
        </Tabs>

        <div className="space-y-2">
          <p className="text-sm font-medium italic text-foreground/80">"{prompt}"</p>
          <Textarea
            placeholder="Andika hapa..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={2000}
            className="resize-none rounded-xl"
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPrompt(getRandomPrompt(mode))}
              >
                New prompt ↻
              </Button>
              <span className="text-xs text-muted-foreground">{content.length}/2000</span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || submitJournal.isPending}
              size="sm"
            >
              {submitJournal.isPending ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </div>

        {/* Recent entries */}
        {journalEntries.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Entries</p>
            {(journalEntries as any[]).slice(0, 3).map((entry) => (
              <div key={entry.id} className="p-3 rounded-xl bg-muted/30 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{JOURNAL_MODES[entry.entry_mode as keyof typeof JOURNAL_MODES]?.icon} {entry.entry_mode.replace(/_/g, ' ')}</span>
                  <span>{format(new Date(entry.created_at), 'MMM d, h:mm a')}</span>
                </div>
                <p className="text-sm text-foreground line-clamp-2">{entry.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
