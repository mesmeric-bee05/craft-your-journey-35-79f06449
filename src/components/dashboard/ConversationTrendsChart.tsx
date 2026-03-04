import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ConversationTrendsChartProps {
  data: { date: string; messages: number; resolved: number }[];
  loading: boolean;
}

export function ConversationTrendsChart({ data, loading }: ConversationTrendsChartProps) {
  if (loading) {
    return (
      <Card className="shadow-soft border-border/50">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-display">Conversation Trends</CardTitle>
        <p className="text-sm text-muted-foreground">Messages & resolutions over the last 7 days</p>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(152, 65%, 42%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(152, 65%, 42%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                }}
              />
              <Area
                type="monotone"
                dataKey="messages"
                stroke="hsl(217, 91%, 45%)"
                fillOpacity={1}
                fill="url(#colorMessages)"
                strokeWidth={2}
                name="Messages"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="hsl(152, 65%, 42%)"
                fillOpacity={1}
                fill="url(#colorResolved)"
                strokeWidth={2}
                name="Resolved"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
