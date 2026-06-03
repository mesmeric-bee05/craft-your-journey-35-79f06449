import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { useHealthScore } from "@/hooks/useHealthScore";
import { useHealthHistory } from "@/hooks/useHealthHistory";

export function HealthScoreTile() {
  const { score, recompute } = useHealthScore();
  const history = useHealthHistory(7);

  const data = (history.data ?? []).map((h) => ({ d: h.snapshot_date.slice(5), v: h.overall }));
  const first = data[0]?.v ?? score.data?.overall ?? 0;
  const last = data[data.length - 1]?.v ?? score.data?.overall ?? 0;
  const delta = last - first;

  const factors = (score.data?.factors ?? {}) as Record<string, unknown>;
  const components = score.data
    ? [
        { key: "VoC", v: score.data.voc_component },
        { key: "Engagement", v: score.data.engagement_component },
        { key: "Inventory", v: score.data.inventory_component },
        { key: "Growth", v: score.data.growth_component },
      ].sort((a, b) => a.v - b.v).slice(0, 2)
    : [];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> SmartReach Health
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={() => recompute.mutate()} disabled={recompute.isPending}>
          Recompute
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {score.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="flex items-end justify-between">
            <div>
              <div className="text-4xl font-bold text-foreground">{score.data?.overall ?? 0}</div>
              <div className="text-xs text-muted-foreground">out of 100</div>
            </div>
            <div className={`flex items-center text-sm ${delta >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {delta >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {delta >= 0 ? "+" : ""}{delta} (7d)
            </div>
          </div>
        )}

        {data.length > 1 && (
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="hs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip cursor={{ stroke: "hsl(var(--muted))" }} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="url(#hs)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {components.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Focus areas:{" "}
            {components.map((c, i) => (
              <span key={c.key}>
                <span className="text-foreground font-medium">{c.key}</span> ({c.v})
                {i < components.length - 1 ? " • " : ""}
              </span>
            ))}
          </div>
        )}

        <Button asChild size="sm" variant="outline" className="w-full">
          <Link to="/analytics">View breakdown</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
