import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, ChevronLeft, ChevronRight, History } from "lucide-react";
import { useCronRunsTimeline, type CronRun } from "@/hooks/useCronRunsTimeline";

const PAGE_SIZE = 50;

function toCsv(rows: CronRun[]): string {
  const headers = ["started_at", "job_name", "status", "duration_ms", "rows_affected", "error_text"];
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      r.started_at, r.job_name, r.status,
      r.duration_ms ?? "", r.rows_affected ?? "", escape(r.error_text ?? ""),
    ].map(escape).join(","));
  }
  return lines.join("\n");
}

function downloadCsv(rows: CronRun[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cron-runs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const ALL_JOBS = [
  "snapshot-health-scores",
  "security-rescan-runner",
  "gsc-submit-sitemap",
  "seo-route-audit",
];

interface CronRunsTimelineProps {
  /** Restrict the job filter (and results) to these job names. */
  jobs?: string[];
  title?: string;
}

export function CronRunsTimeline({ jobs, title = "Runs timeline" }: CronRunsTimelineProps = {}) {
  const jobOptions = jobs ?? ALL_JOBS;
  const [search, setSearch] = useState("");
  const [jobName, setJobName] = useState<string>(jobs ? jobs[0] : "all");
  const [status, setStatus] = useState<string>("all");
  const [sinceHours, setSinceHours] = useState<string>("168");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);


  const filters = useMemo(() => ({
    jobName: jobName === "all" ? null : jobName,
    status: status === "all" ? null : status,
    sinceHours: Number(sinceHours),
    search: search.trim() || null,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }), [jobName, status, sinceHours, search, page]);

  const { data, isLoading } = useCronRunsTimeline(filters);
  const rows = data ?? [];
  const total = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4" /> {title}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => downloadCsv(rows)} disabled={rows.length === 0}>
          <Download className="h-3 w-3 mr-2" /> Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input
            placeholder="Search job or error…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
          <Select value={jobName} onValueChange={(v) => { setJobName(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Job" /></SelectTrigger>
            <SelectContent>
              {!jobs && <SelectItem value="all">All jobs</SelectItem>}
              {jobOptions.map((j) => (
                <SelectItem key={j} value={j}>{j}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="skipped">Skipped (setup needed)</SelectItem>
              <SelectItem value="running">Running</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sinceHours} onValueChange={(v) => { setSinceHours(v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24">Last 24 hours</SelectItem>
              <SelectItem value="168">Last 7 days</SelectItem>
              <SelectItem value="720">Last 30 days</SelectItem>
              <SelectItem value="8760">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-md divide-y divide-border/40">
          {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-12 m-2" />)}
          {!isLoading && rows.length === 0 && (
            <div className="text-muted-foreground text-center py-8 text-sm">No runs match these filters.</div>
          )}
          {rows.map((r) => (
            <div key={r.id} className="p-3 text-sm">
              <button
                className="w-full flex items-center justify-between gap-2 text-left"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant={r.status === "success" ? "secondary" : r.status === "failure" ? "destructive" : "outline"}>
                    {r.status}
                  </Badge>
                  <span className="font-mono text-xs truncate">{r.job_name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span>{r.duration_ms ?? "?"}ms</span>
                  <span>{r.rows_affected ?? 0} rows</span>
                  <span>{new Date(r.started_at).toLocaleString()}</span>
                </div>
              </button>
              {expanded === r.id && (
                <div className="mt-2 space-y-2">
                  {r.error_text && (
                    <pre className="text-xs p-2 rounded bg-destructive/10 text-destructive font-mono whitespace-pre-wrap break-all">
                      {r.error_text}
                    </pre>
                  )}
                  <pre className="text-xs p-2 rounded bg-muted font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(r.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>{total} total · page {page + 1} of {totalPages}</div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
