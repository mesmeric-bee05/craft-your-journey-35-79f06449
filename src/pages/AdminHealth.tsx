import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SEO } from "@/components/seo/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Clock } from "lucide-react";
import { useCronHealth, type CronHealth } from "@/hooks/useCronHealth";
import { CronRunsTimeline } from "@/components/admin/CronRunsTimeline";
import { RequireAdmin } from "@/components/auth/RequireAdmin";

function fmtDuration(min: number | null) {
  if (min == null) return "never";
  if (min < 60) return `${Math.round(min)}m`;
  if (min < 1440) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / 1440)}d`;
}

function HealthTile({ h, onRun, pending }: { h: CronHealth; onRun: () => void; pending: boolean }) {
  const skipped = h.last_status === "skipped";
  const stale = h.is_stale && !skipped;
  const Icon = h.last_status === "failure" ? AlertTriangle : stale || skipped ? Clock : CheckCircle2;
  const tone = h.last_status === "failure" ? "text-destructive" : stale || skipped ? "text-amber-500" : "text-emerald-500";
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`h-4 w-4 ${tone}`} />
          {h.job_name}
        </CardTitle>
        <Badge
          variant={h.last_status === "failure" || stale ? "destructive" : "secondary"}
          className={skipped ? "border-amber-500 text-amber-600 dark:text-amber-400" : undefined}
        >
          {skipped ? "setup needed" : h.last_status ?? "never run"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Last success</span><span>{fmtDuration(h.minutes_since_success)} ago</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Expected every</span><span>{fmtDuration(h.expected_interval_minutes)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Last duration</span><span>{h.last_duration_ms ? `${h.last_duration_ms}ms` : "—"}</span></div>
        {h.last_error && (
          <div
            className={`text-xs p-2 rounded font-mono break-all ${
              skipped ? "bg-amber-500/10 text-amber-700 dark:text-amber-300" : "bg-destructive/10 text-destructive"
            }`}
          >
            {h.last_error.slice(0, 300)}
          </div>
        )}
        <Button size="sm" variant="outline" className="w-full" disabled={pending} onClick={onRun}>
          <RefreshCw className={`h-3 w-3 mr-2 ${pending ? "animate-spin" : ""}`} />Run now
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminHealth() {
  const { health, trigger } = useCronHealth();

  return (
    <DashboardLayout>
      <SEO title="System health — SmartReach" description="Monitor scheduled jobs and alerts." path="/admin/health" noindex />
      <RequireAdmin>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Activity className="h-7 w-7" />System Health</h1>
          <p className="text-muted-foreground">Status of nightly cron jobs and background workers.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {health.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-44" />)}
          {(health.data ?? []).map((h) => (
            <HealthTile
              key={h.job_name}
              h={h}
              pending={trigger.isPending}
              onRun={() => trigger.mutate(h.job_name as any)}
            />
          ))}
        </div>

        <CronRunsTimeline />
      </div>
      </RequireAdmin>
    </DashboardLayout>
  );
}
