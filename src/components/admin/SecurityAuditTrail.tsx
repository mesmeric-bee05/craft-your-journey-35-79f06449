import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, ScrollText } from "lucide-react";
import { useSecurityAuditEvents, type SecurityAuditEvent } from "@/hooks/useSecurityAudit";
import { downloadCsv, downloadPdfReport, type ExportColumn } from "@/lib/opsExport";

const ACTION_LABEL: Record<string, string> = {
  scan_triggered: "Scan triggered",
  scan_completed: "Scan completed",
  finding_status_changed: "Finding status changed",
};

const COLUMNS: ExportColumn<SecurityAuditEvent>[] = [
  { key: "created_at", label: "When", value: (r) => new Date(r.created_at).toISOString() },
  { key: "action", label: "Action", value: (r) => ACTION_LABEL[r.action] ?? r.action },
  { key: "actor", label: "Who", value: (r) => r.actor_label ?? r.actor_user_id ?? "automation" },
  { key: "scanner_name", label: "Scanner / job", value: (r) => r.scanner_name ?? "" },
  { key: "finding_internal_id", label: "Finding", value: (r) => r.finding_internal_id ?? "" },
  { key: "old_status", label: "From", value: (r) => r.old_status ?? "" },
  { key: "new_status", label: "To", value: (r) => r.new_status ?? "" },
  { key: "note", label: "Note", value: (r) => r.note ?? "" },
];

export function SecurityAuditTrail() {
  const { data, isLoading } = useSecurityAuditEvents();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      if (action !== "all" && r.action !== action) return false;
      if (!q) return true;
      return `${r.actor_label ?? ""} ${r.finding_internal_id ?? ""} ${r.scanner_name ?? ""} ${r.note ?? ""} ${r.new_status ?? ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [data, search, action]);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4" aria-hidden="true" /> Security change audit log
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2" disabled={!rows.length}>
                <Download className="h-3 w-3" aria-hidden="true" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => downloadCsv(rows, COLUMNS, "security-audit-log")}>
                Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  downloadPdfReport(rows, COLUMNS, "security-audit-log", {
                    title: "SmartReach — security change audit log",
                    subtitle: `${rows.length} event(s)`,
                  })
                }
              >
                Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="w-[220px]" aria-label="Filter by action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {Object.entries(ACTION_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search person, finding, note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[240px]"
            aria-label="Search audit log"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
        {!isLoading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No security changes recorded yet.</p>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={r.action === "finding_status_changed" ? "default" : "secondary"}>
                {ACTION_LABEL[r.action] ?? r.action}
              </Badge>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              <span className="text-xs">
                by <span className="font-medium">{r.actor_label ?? "automation"}</span>
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {r.finding_internal_id && <span className="font-mono">{r.finding_internal_id} </span>}
              {r.old_status && r.new_status && <span>· {r.old_status} → {r.new_status} </span>}
              {!r.old_status && r.new_status && <span>· {r.new_status} </span>}
              {r.scanner_name && <span>· {r.scanner_name}</span>}
            </div>
            {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
