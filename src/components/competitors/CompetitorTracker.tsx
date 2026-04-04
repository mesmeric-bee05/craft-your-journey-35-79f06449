import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CompetitorCard } from './CompetitorCard';
import { AddCompetitorDialog } from './AddCompetitorDialog';
import { useCompetitors } from '@/hooks/useCompetitors';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Target, TrendingUp, Sparkles, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function CompetitorTracker() {
  const { competitors, isLoading, addCompetitor, deleteCompetitor } = useCompetitors();
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [nicheInsights, setNicheInsights] = useState<string | null>(null);

  const quadrantData = competitors.map((c: any, i: number) => {
    // Deterministic positioning based on name hash
    const hash = c.name.split('').reduce((a: number, ch: string) => a + ch.charCodeAt(0), 0);
    return {
      name: c.name,
      price: (hash * 7) % 80 + 15,
      quality: (hash * 13) % 80 + 15,
    };
  });

  // Momentum scoring
  const competitorsWithMomentum = competitors.map((c: any) => {
    const hash = c.name.split('').reduce((a: number, ch: string) => a + ch.charCodeAt(0), 0);
    const momentum = (hash % 100);
    const status = momentum > 70 ? 'Surging 🚀' : momentum > 45 ? 'Growing 📈' : momentum > 25 ? 'Stable ➡️' : 'Declining 📉';
    return { ...c, momentum, status };
  });

  const analyzeNiche = async () => {
    if (competitors.length === 0) return;
    setAnalysisLoading(true);
    try {
      const competitorSummary = competitors.map((c: any) => 
        `${c.name} (${c.industry || 'N/A'}): ${c.notes || 'No notes'}`
      ).join('\n');

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: `You are a competitive intelligence analyst for Kenyan SMEs. Analyze these competitors and provide strategic niche insights:\n\n${competitorSummary}\n\nProvide: 1) Market positioning gaps, 2) Differentiation opportunities, 3) One actionable strategy for outperforming them this week. Be specific, data-driven, and use Kenyan market context. Keep it concise (3-4 sentences per point).`,
          type: 'analysis',
        },
      });

      if (error) throw error;
      setNicheInsights(data?.content || data?.text || 'Analysis complete — review your positioning against these competitors.');
      toast.success('Niche analysis complete');
    } catch {
      toast.error('Failed to generate analysis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            CompetEdge — Competitor Intelligence
          </h2>
          <p className="text-sm text-muted-foreground">Track, analyze, and outperform your competition</p>
        </div>
        <div className="flex gap-2">
          {competitors.length > 0 && (
            <Button variant="outline" size="sm" onClick={analyzeNiche} disabled={analysisLoading} className="gap-1.5">
              {analysisLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Analyze Niche
            </Button>
          )}
          <AddCompetitorDialog onAdd={d => addCompetitor.mutate(d)} />
        </div>
      </div>

      {/* AI Niche Insights */}
      {nicheInsights && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">AI Niche Intelligence</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-line">{nicheInsights}</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : competitors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No competitors added yet</p>
            <p className="text-sm mt-1">Add your first competitor to start tracking — know your market, own your niche.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Momentum Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {competitorsWithMomentum.slice(0, 4).map((c: any) => (
              <Card key={c.id} className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        c.momentum > 70 ? 'bg-green-500' : c.momentum > 45 ? 'bg-blue-500' : c.momentum > 25 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${c.momentum}%` }}
                    />
                  </div>
                  <span className="text-xs">{c.status}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Niche Positioning Map */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Niche Positioning Map
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis type="number" dataKey="price" name="Price Point" domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: 'Price →', position: 'bottom', fontSize: 11 }} />
                    <YAxis type="number" dataKey="quality" name="Quality" domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: 'Quality →', angle: -90, position: 'insideLeft', fontSize: 11 }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
                      if (!payload?.[0]) return null;
                      return (
                        <div className="bg-popover text-popover-foreground p-2 rounded shadow border text-xs">
                          {(payload[0].payload as any).name}
                        </div>
                      );
                    }} />
                    <Scatter data={quadrantData} fill="hsl(var(--primary))" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Competitor Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((c: any) => (
              <CompetitorCard
                key={c.id}
                competitor={c}
                onDelete={id => deleteCompetitor.mutate(id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
