import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, BellRing, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useCronHealth } from "@/hooks/useCronHealth";
import { useSecurityFindings } from "@/hooks/useSecurityFindings";
import {
  useLatestScanRuns,
  useSecurityNotifications,
  useLogScanTrigger,
  type LatestScanRun,
} from "@/hooks/useSecurityAudit";

const CHECK_LABEL: Record<string, string> = {
  headers: "Security headers",
  rpc_roles: "Database RPC roles",
  storage: "Storage access",
  rls: "Row level security",
};

const statusTone = (s: string) =>
  s === "pass" ? "text-emerald-500" : s === "warn" ? "text-amber-500" : "text-destructive";

function ScanTile({ run }: { run: LatestScanRun }) {
  const Icon = run.status === "pass" ? ShieldCheck : run.status === "warn" ? ShieldAlert : ShieldX;
  return (
    <div className="rounded-lg border p-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium flex items-center gap-2">
          <Icon className={`h-4 w-4 ${statusTone(run.status)}`} aria-hidden="true" />
          {CHECK_LABEL[run.check_type] ?? run.check_type}
        </span>
        <Badge variant={run.status === "pass" ? "secondary" : run.status === "warn" ? "outline" : "destructive"}>
          {run.status}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Last scanned {new Date(run.created_at).toLocaleString()} · {run.environment}
      </p>
      {run.summary && <p className="text-xs text-muted-foreground line-clamp-2">{run.summary}</p>}
    </div>
  );
}

export function SecurityScanPanel() {
  const scans = useLatestScanRuns();
  const { findings } = useSecurityFindings();
  const { trigger } = useCronHealth();
  const logTrigger = useLogScanTrigger();
  const { notifications, markRead, unreadCount } = useSecurityNotifications();

  const all = findings.data ?? [];
  const open = all.filter((f) => f.status === "open");
  const critical = open.filter((f) => f.severity === "error");
  const latest = scans.data?.latest ?? [];
  const lastScanAt = scans.data?.recent?.[0]?.created_at ?? null;

  const runScan = async () => {
    // Audit first so an abusive or failed dispatch is still attributable.
    try {
      await logTrigger.mutateAsync("security-rescan-runner");
    } catch {
      /* the rate-limited edge function is still the hard gate */
    }
    trigger.mutate("security-rescan-runner");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Latest security scan
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {lastScanAt ? `Last scan completed ${new Date(lastScanAt).toLocaleString()}` : "No scan recorded yet"}
            </p>
          </div>
          <Button size="sm" variant="outline" disabled={trigger.isPending} onClick={runScan} className="gap-2">
            <RefreshCw className={`h-3 w-3 ${trigger.isPending ? "animate-spin" : ""}`} aria-hidden="true" />
            Run scan now
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Open findings</div>
              <div className="text-2xl font-semibold">{open.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Critical open</div>
              <div className={`text-2xl font-semibold ${critical.length ? "text-destructive" : ""}`}>
                {critical.length}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Resolved</div>
              <div className="text-2xl font-semibold">{all.filter((f) => f.status === "fixed").length}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {scans.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-20" />)}
            {!scans.isLoading && latest.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No automated check has reported yet. Runs appear here after the nightly job or CI uploads results.
              </p>
            )}
            {latest.map((r) => <ScanTile key={r.check_type} run={r} />)}
          </div>

          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/security/findings">
              <ExternalLink className="h-3 w-3" aria-hidden="true" /> Open findings audit trail
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BellRing className="h-4 w-4" aria-hidden="true" /> Security alerts
            {unreadCount > 0 && <Badge variant="destructive">{unreadCount} new</Badge>}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                markRead.mutate((notifications.data ?? []).filter((n) => !n.read_at).map((n) => n.id))
              }
            >
              Mark all read
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {notifications.isLoading && [0, 1].map((i) => <Skeleton key={i} className="h-12" />)}
          {!notifications.isLoading && (notifications.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No alerts yet. You'll be notified here when a scan completes or a finding changes status.
            </p>
          )}
          {(notifications.data ?? []).map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-3 text-sm ${n.read_at ? "opacity-70" : "bg-primary/5 border-primary/30"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{n.title}</span>
                <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
              </div>
              {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
