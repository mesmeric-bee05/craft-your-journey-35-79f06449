import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAdminAuditFeed } from "@/hooks/useCapital";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Download, RefreshCw } from "lucide-react";

const ACTIONS = [
  "all",
  "capital.apply",
  "capital.approve",
  "capital.reject",
  "capital.disburse.request",
  "capital.disburse.confirmed",
  "capital.disburse.failed",
  "capital.repayment.record",
  "capital.advance.written_off",
  "capital.advance.status",
  "capital.partner.rotate_secret",
];

function toCsv(rows: Array<Record<string, unknown>>): string {
  const cols = ["created_at", "action", "entity_type", "entity_id", "business_id", "actor_user_id", "metadata"];
  const header = cols.join(",");
  // Neutralize spreadsheet formulas: partner-supplied audit metadata is
  // quoted and any leading formula character is defused before download.
  const body = rows.map((r) =>
    cols.map((c) => {
      const v = r[c] ?? "";
      const s = typeof v === "string" ? v : JSON.stringify(v);
      const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${safe.replace(/"/g, '""')}"`;
    }).join(",")
  ).join("\n");
  return `${header}\n${body}`;
}

export default function CapitalAuditPage() {
  const { data = [], isLoading, refetch, isRefetching } = useAdminAuditFeed(500);
  const [action, setAction] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (action !== "all" && r.action !== action) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.action} ${r.entity_id} ${r.business_id} ${JSON.stringify(r.metadata)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data, action, search]);

  const download = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capital-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <Helmet><title>Capital Audit Log — Admin</title></Helmet>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-7 w-7 text-primary" /> Capital Audit Log
            </h1>
            <p className="text-muted-foreground mt-1">Complete history of Capital approvals, disbursements, and repayments.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a === "all" ? "All actions" : a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[200px]" />
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" onClick={download} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">No audit entries match your filters.</Card>
        ) : (
          <Card className="divide-y">
            {filtered.map((r) => (
              <div key={r.id} className="p-3 flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{r.action}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                    {r.entity_id && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {r.entity_type}:{r.entity_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <pre className="text-[11px] mt-1 text-muted-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(r.metadata, null, 0)}
                  </pre>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
