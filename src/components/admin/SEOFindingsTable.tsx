import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, AlertCircle } from "lucide-react";
import { useSEOAuditFindings, type SEOAuditFinding } from "@/hooks/useSEOAudit";

function toCsv(rows: SEOAuditFinding[]): string {
  const headers = ["route", "check_name", "severity", "message"];
  const esc = (v: unknown) => {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [headers.join(","), ...rows.map(r => [r.route, r.check_name, r.severity, r.message].map(esc).join(","))].join("\n");
}

function download(rows: SEOAuditFinding[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `seo-findings-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function SEOFindingsTable({ runId }: { runId: string | null }) {
  const { data, isLoading } = useSEOAuditFindings(runId);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(r =>
      !q || r.route.toLowerCase().includes(q) || r.check_name.toLowerCase().includes(q) || r.message.toLowerCase().includes(q)
    );
  }, [data, search]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Route findings</CardTitle>
        <Button size="sm" variant="outline" onClick={() => download(filtered)} disabled={filtered.length === 0}>
          <Download className="h-3 w-3 mr-2" /> Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input placeholder="Search route, check, or message…" value={search} onChange={e => setSearch(e.target.value)} />
        {!runId && <p className="text-sm text-muted-foreground">Select a run to see its findings.</p>}
        {isLoading && [0, 1, 2].map(i => <Skeleton key={i} className="h-10" />)}
        {runId && !isLoading && filtered.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No findings — all routes pass ✓</p>}
        <div className="divide-y divide-border/40">
          {filtered.map(r => (
            <div key={r.id} className="py-2 flex items-start gap-3 text-sm">
              <Badge variant={r.severity === "error" ? "destructive" : r.severity === "warn" ? "secondary" : "outline"} className="shrink-0">
                {r.severity}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{r.route}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs">{r.check_name}</span>
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">{r.message}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
