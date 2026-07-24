import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useCapitalWebhookEvents,
  useFailedDisbursements,
  useRetryDisbursement,
  useReprocessWebhookEvent,
  useTriggerRepaymentCron,
  type CapitalWebhookEventRow,
} from "@/hooks/useCapital";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Activity, RefreshCw, PlayCircle, Loader2, AlertCircle, Webhook, Banknote, Download,
} from "lucide-react";
import { CronRunsTimeline } from "@/components/admin/CronRunsTimeline";
import { Link } from "react-router-dom";

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

function toCsv(rows: CapitalWebhookEventRow[]): string {
  const cols = ["created_at", "event", "status", "sig_valid", "advance_id", "error"];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [cols.join(","), ...rows.map(r =>
    [r.created_at, r.event, r.status, r.sig_valid, r.advance_id ?? "", r.error ?? ""].map(esc).join(",")
  )].join("\n");
}

export default function CapitalOpsPage() {
  const events = useCapitalWebhookEvents(200);
  const failed = useFailedDisbursements();
  const retryDisburse = useRetryDisbursement();
  const reprocess = useReprocessWebhookEvent();
  const triggerCron = useTriggerRepaymentCron();

  const [eventStatus, setEventStatus] = useState<string>("all");
  const [eventSearch, setEventSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    const rows = events.data ?? [];
    return rows.filter(r => {
      if (eventStatus !== "all" && r.status !== eventStatus) return false;
      if (eventSearch) {
        const q = eventSearch.toLowerCase();
        const hay = `${r.event} ${r.advance_id ?? ""} ${r.error ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events.data, eventStatus, eventSearch]);

  const downloadEventsCsv = () => {
    const blob = new Blob([toCsv(filteredEvents)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capital-webhook-events-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <Helmet><title>Capital Operations — Admin</title></Helmet>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" /> Capital Operations
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and retry disbursements, partner webhooks, and repayment cron runs.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link to="/admin/capital">Review queue</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/capital/audit">Audit log</Link>
            </Button>
            <Button
              onClick={() => triggerCron.mutate()}
              disabled={triggerCron.isPending}
            >
              {triggerCron.isPending
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <PlayCircle className="h-4 w-4 mr-2" />}
              Run repayment cron now
            </Button>
          </div>
        </div>

        <Tabs defaultValue="disbursements">
          <TabsList>
            <TabsTrigger value="disbursements">
              <Banknote className="h-4 w-4 mr-2" />
              Disbursements
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Webhook className="h-4 w-4 mr-2" />
              Partner webhooks
            </TabsTrigger>
            <TabsTrigger value="cron">
              <Activity className="h-4 w-4 mr-2" />
              Cron runs
            </TabsTrigger>
          </TabsList>

          {/* Disbursements */}
          <TabsContent value="disbursements" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Failed / stuck disbursements</CardTitle>
                <Button size="sm" variant="outline" onClick={() => failed.refetch()} disabled={failed.isRefetching}>
                  <RefreshCw className={`h-3 w-3 mr-2 ${failed.isRefetching ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {failed.isLoading && [0, 1, 2].map(i => <Skeleton key={i} className="h-16" />)}
                {!failed.isLoading && (failed.data?.length ?? 0) === 0 && (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    No failed disbursements. All advances are settling cleanly.
                  </div>
                )}
                {failed.data?.map(row => (
                  <div key={row.id} className="border rounded-md p-3 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{row.businesses?.name ?? "Unknown business"}</span>
                        <Badge variant={row.disbursement_status === "failed" ? "destructive" : "outline"}>
                          {row.disbursement_status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{fmtKES(Number(row.principal_kes))}</span>
                      </div>
                      {row.disbursement_error && (
                        <div className="text-xs text-destructive mt-1 flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span className="break-all">{row.disbursement_error}</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        Requested {row.disbursement_requested_at ? new Date(row.disbursement_requested_at).toLocaleString() : "—"}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={pendingId === row.id}
                      onClick={async () => {
                        setPendingId(row.id);
                        try { await retryDisburse.mutateAsync(row.id); }
                        finally { setPendingId(null); }
                      }}
                    >
                      {pendingId === row.id
                        ? <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        : <RefreshCw className="h-3 w-3 mr-2" />}
                      Retry disbursement
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base">Partner webhook events</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    placeholder="Search event or advance…"
                    className="w-[220px]"
                    value={eventSearch}
                    onChange={e => setEventSearch(e.target.value)}
                  />
                  <Select value={eventStatus} onValueChange={setEventStatus}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={downloadEventsCsv} disabled={filteredEvents.length === 0}>
                    <Download className="h-3 w-3 mr-2" /> Export
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => events.refetch()} disabled={events.isRefetching}>
                    <RefreshCw className={`h-3 w-3 ${events.isRefetching ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {events.isLoading && [0, 1, 2].map(i => <Skeleton key={i} className="h-14" />)}
                {!events.isLoading && filteredEvents.length === 0 && (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    No webhook events yet. Partner lenders will surface here as they call the endpoint.
                  </div>
                )}
                {filteredEvents.map(e => (
                  <div key={e.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <Badge variant={
                          e.status === "processed" ? "secondary"
                            : e.status === "failed" ? "destructive"
                              : "outline"
                        }>{e.status}</Badge>
                        <span className="font-mono text-xs">{e.event}</span>
                        {e.advance_id && (
                          <span className="text-xs text-muted-foreground font-mono">
                            adv:{e.advance_id.slice(0, 8)}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(e.created_at).toLocaleString()}
                        </span>
                      </div>
                      {e.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingId === e.id}
                          onClick={async () => {
                            setPendingId(e.id);
                            try { await reprocess.mutateAsync(e.id); }
                            finally { setPendingId(null); }
                          }}
                        >
                          {pendingId === e.id
                            ? <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            : <RefreshCw className="h-3 w-3 mr-2" />}
                          Reprocess
                        </Button>
                      )}
                    </div>
                    {e.error && (
                      <div className="text-xs text-destructive break-all">{e.error}</div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cron */}
          <TabsContent value="cron" className="mt-4">
            <CronRunsTimeline />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
