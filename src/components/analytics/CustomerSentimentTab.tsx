import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCustomerSentiment } from "@/hooks/useCustomerSentiment";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useQuery } from "@tanstack/react-query";
import { Smile, Meh, Frown, MessageSquare, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";

interface Props {
  dateRange: number;
}

export function CustomerSentimentTab({ dateRange }: Props) {
  const { trends, negatives } = useCustomerSentiment(dateRange);
  const { business } = useBusiness();
  const [drill, setDrill] = useState<string | null>(null);

  const drillQuery = useQuery({
    queryKey: ["voc-drill", business?.id, drill, dateRange],
    enabled: !!business?.id && !!drill,
    queryFn: async () => {
      const since = new Date(Date.now() - dateRange * 86400000).toISOString();
      const { data, error } = await supabase
        .from("customer_sentiment_log")
        .select("id, sentiment, score, themes, language, source, raw_text, analyzed_at")
        .eq("business_id", business!.id)
        .gte("analyzed_at", since)
        .contains("themes", [drill!])
        .order("analyzed_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const summary = useMemo(() => {
    const rows = trends.data ?? [];
    const total = rows.reduce((s, r) => s + r.total, 0);
    const pos = rows.reduce((s, r) => s + r.positive, 0);
    const neu = rows.reduce((s, r) => s + r.neutral, 0);
    const neg = rows.reduce((s, r) => s + r.negative, 0);
    const themeCounts: Record<string, number> = {};
    for (const r of rows) {
      for (const t of r.top_themes ?? []) {
        themeCounts[t.theme] = (themeCounts[t.theme] ?? 0) + t.count;
      }
    }
    const themes = Object.entries(themeCounts)
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
    return { total, pos, neu, neg, themes };
  }, [trends.data]);

  const chartData = (trends.data ?? []).map((r) => ({
    date: r.date.slice(5),
    positive: r.positive,
    neutral: r.neutral,
    negative: r.negative,
    score: r.avg_score ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          icon={<MessageSquare className="h-4 w-4" />}
          label="Messages analysed"
          value={summary.total}
        />
        <SummaryCard
          icon={<Smile className="h-4 w-4 text-green-500" />}
          label="Positive"
          value={summary.pos}
          accent={summary.total ? Math.round((summary.pos / summary.total) * 100) : 0}
        />
        <SummaryCard
          icon={<Meh className="h-4 w-4 text-yellow-500" />}
          label="Neutral"
          value={summary.neu}
          accent={summary.total ? Math.round((summary.neu / summary.total) * 100) : 0}
        />
        <SummaryCard
          icon={<Frown className="h-4 w-4 text-red-500" />}
          label="Negative"
          value={summary.neg}
          accent={summary.total ? Math.round((summary.neg / summary.total) * 100) : 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment trend</CardTitle>
            <CardDescription>Daily breakdown across the last {dateRange} days</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {trends.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="positive" stroke="hsl(142 76% 45%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="neutral" stroke="hsl(48 96% 53%)" strokeWidth={2} />
                  <Line type="monotone" dataKey="negative" stroke="hsl(0 84% 60%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average score</CardTitle>
            <CardDescription>-1 (very negative) to 1 (very positive)</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {trends.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis domain={[-1, 1]} fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Top themes
            </CardTitle>
            <CardDescription>What customers keep talking about</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.themes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No themes yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {summary.themes.map((t) => {
                  const size = Math.min(1.6, 0.85 + t.count * 0.08);
                  return (
                    <Badge key={t.theme} variant="secondary" style={{ fontSize: `${size}rem` }} className="cursor-pointer hover:bg-primary/20" onClick={() => setDrill(t.theme)}>
                      {t.theme} <span className="ml-1 opacity-60">×{t.count}</span>
                    </Badge>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent negative feedback</CardTitle>
            <CardDescription>Drill in to address quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px] pr-3">
              {negatives.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                </div>
              ) : (negatives.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No negative messages — vizuri sana!</p>
              ) : (
                <div className="space-y-2">
                  {negatives.data!.map((n) => (
                    <div key={n.id} className="rounded-md border p-3 hover:bg-muted/50 transition">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="text-xs">{n.sentiment}</Badge>
                          <Badge variant="outline" className="text-xs uppercase">{n.language}</Badge>
                          <Badge variant="outline" className="text-xs">{n.source}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.analyzed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{n.raw_text}</p>
                      {n.themes.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {n.themes.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                          ))}
                        </div>
                      )}
                      {n.conversation_id && (
                        <Button asChild variant="link" size="sm" className="px-0 mt-1 h-auto">
                          <Link to={`/inbox?c=${n.conversation_id}`}>View conversation</Link>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Sheet open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          <SheetHeader>
            <SheetTitle>Theme: {drill}</SheetTitle>
            <SheetDescription>Recent messages mentioning this theme</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {drillQuery.isLoading && <Skeleton className="h-20 w-full" />}
            {(drillQuery.data ?? []).map((m: any) => (
              <div key={m.id} className="border rounded-md p-2 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={m.sentiment === "negative" ? "destructive" : m.sentiment === "positive" ? "default" : "secondary"}>{m.sentiment}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(m.analyzed_at).toLocaleDateString()}</span>
                </div>
                <p className="line-clamp-3">{m.raw_text}</p>
              </div>
            ))}
            {drillQuery.data && drillQuery.data.length === 0 && <p className="text-sm text-muted-foreground">No messages found.</p>}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: { icon: React.ReactNode; label: string; value: number; accent?: number }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {accent != null && <p className="text-xs text-muted-foreground">{accent}% of total</p>}
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      No data yet. Sentiment will appear once customers send messages.
    </div>
  );
}
