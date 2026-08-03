import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useCapitalWebhookEvents,
  useFailedDisbursements,
  useRetryDisbursement,
  useReplayWebhookEvent,
  useTriggerRepaymentCron,
  type CapitalWebhookEventRow,
  type FailedDisbursementRow,
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
  Activity, RefreshCw, PlayCircle, Loader2, AlertCircle, Webhook, Banknote,
  Download, FileText, Repeat, CheckCircle2, XCircle,
} from "lucide-react";
import { CronRunsTimeline } from "@/components/admin/CronRunsTimeline";
import { Link } from "react-router-dom";
import { downloadCsv, downloadPdfReport, type ExportColumn } from "@/lib/opsExport";

const fmtKES = (n: number) => `KES ${Math.round(n).toLocaleString()}`;

const eventColumns: ExportColumn<CapitalWebhookEventRow>[] = [
  { key: "created_at", label: "Received", value: (r) => new Date(r.created_at).toLocaleString() },
  { key: "event", label: "Event", value: (r) => r.event },
  { key: "status", label: "Status", value: (r) => r.status },
  { key: "sig_valid", label: "Signature", value: (r) => (r.sig_valid ? "valid" : "invalid") },
  { key: "advance_id", label: "Advance", value: (r) => r.advance_id ?? "" },
  { key: "processed_at", label: "Processed", value: (r) => r.processed_at ?? "" },
  { key: "error", label: "Error", value: (r) => r.error ?? "" },
];

const disbursementColumns: ExportColumn<FailedDisbursementRow>[] = [
  { key: "business", label: "Business", value: (r) => r.businesses?.name ?? "Unknown" },
  { key: "principal_kes", label: "Principal (KES)", value: (r) => Number(r.principal_kes) },
  { key: "disbursement_status", label: "Status", value: (r) => r.disbursement_status },
  {
    key: "disbursement_requested_at", label: "Requested",
    value: (r) => (r.disbursement_requested_at ? new Date(r.disbursement_requested_at).toLocaleString() : ""),
  },
  { key: "disbursement_error", label: "Error", value: (r) => r.disbursement_error ?? "" },
];

export default function CapitalOpsPage() {
  const events = useCapitalWebhookEvents(200);
  const failed = useFailedDisbursements();
  const retryDisburse = useRetryDisbursement();
  const replay = useReplayWebhookEvent();
  const triggerCron = useTriggerRepaymentCron();

  const [eventStatus, setEventStatus] = useState<string>("all");
  const [eventSearch, setEventSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rowResult, setRowResult] = useState<Record<string, { ok: boolean; message: string }>>({});

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

  const eventFilterSummary = [
    `status: ${eventStatus}`,
    eventSearch ? `search: "${eventSearch}"` : "search: none",
  ];

  const doReplay = async (id: string) => {
    setPendingId(id);
    try {
      const res = await replay.mutateAsync(id);
      setRowResult(prev => ({
        ...prev,
        [id]: { ok: true, message: `Replayed: ${res.code ?? "ok"}` },
      }));
    } catch (e) {
      setRowResult(prev => ({
        ...prev,
        [id]: { ok: false, message: (e as Error).message },
      }));
    } finally {
      setPendingId(null);
    }
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
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base">Failed / stuck disbursements</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm" variant="outline"
                    disabled={(failed.data?.length ?? 0) === 0}
                    onClick={() => downloadCsv(failed.data ?? [], disbursementColumns, "capital-disbursements")}
                  >
                    <Download className="h-3 w-3 mr-2" /> CSV
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    disabled={(failed.data?.length ?? 0) === 0}
                    onClick={() => downloadPdfReport(
                      failed.data ?? [], disbursementColumns, "capital-disbursements",
                      { title: "Capital disbursement exceptions", subtitle: "Failed and in-flight disbursements" },
                    )}
                  >
                    <FileText className="h-3 w-3 mr-2" /> PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => failed.refetch()} disabled={failed.isRefetching}>
                    <RefreshCw className={`h-3 w-3 ${failed.isRefetching ? "animate-spin" : ""}`} />
                  </Button>
                </div>
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
                  <Button
                    size="sm" variant="outline"
                    onClick={() => downloadCsv(filteredEvents, eventColumns, "capital-webhook-events")}
                    disabled={filteredEvents.length === 0}
                  >
                    <Download className="h-3 w-3 mr-2" /> CSV
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => downloadPdfReport(
                      filteredEvents, eventColumns, "capital-webhook-events",
                      {
                        title: "Capital partner webhook audit",
                        subtitle: "Inbound partner lender events",
                        filters: eventFilterSummary,
                      },
                    )}
                    disabled={filteredEvents.length === 0}
                  >
                    <FileText className="h-3 w-3 mr-2" /> PDF
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
                {filteredEvents.map(e => {
                  const result = rowResult[e.id];
                  return (
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
                        <Button
                          size="sm"
                          variant={e.status === "failed" ? "default" : "outline"}
                          disabled={pendingId === e.id}
                          onClick={() => doReplay(e.id)}
                        >
                          {pendingId === e.id
                            ? <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            : <Repeat className="h-3 w-3 mr-2" />}
                          Replay
                        </Button>
                      </div>
                      {e.error && (
                        <div className="text-xs text-destructive break-all">{e.error}</div>
                      )}
                      {result && (
                        <div className={`text-xs flex items-center gap-1 ${result.ok ? "text-emerald-500" : "text-destructive"}`}>
                          {result.ok
                            ? <CheckCircle2 className="h-3 w-3" />
                            : <XCircle className="h-3 w-3" />}
                          <span className="break-all">{result.message}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
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
