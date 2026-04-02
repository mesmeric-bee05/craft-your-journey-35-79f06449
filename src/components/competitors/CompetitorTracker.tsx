import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CompetitorCard } from './CompetitorCard';
import { AddCompetitorDialog } from './AddCompetitorDialog';
import { useCompetitors } from '@/hooks/useCompetitors';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Target, TrendingUp } from 'lucide-react';

export function CompetitorTracker() {
  const { competitors, isLoading, addCompetitor, deleteCompetitor } = useCompetitors();

  const quadrantData = competitors.map((c: any, i: number) => ({
    name: c.name,
    price: Math.random() * 80 + 20,
    quality: Math.random() * 80 + 20,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Competitor Overview
          </h2>
          <p className="text-sm text-muted-foreground">Track and analyze your competition</p>
        </div>
        <AddCompetitorDialog onAdd={d => addCompetitor.mutate(d)} />
      </div>

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
            <p className="text-sm mt-1">Add your first competitor to start tracking</p>
          </CardContent>
        </Card>
      ) : (
        <>
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
