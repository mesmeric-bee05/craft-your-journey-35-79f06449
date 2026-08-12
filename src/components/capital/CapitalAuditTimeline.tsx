import { useCapitalAuditLog, type CapitalAuditEntry } from "@/hooks/useCapital";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { History, Download } from "lucide-react";
import { downloadCsv, downloadPdfReport, type ExportColumn } from "@/lib/opsExport";


const label = (a: string) =>
  ({
    "capital.apply": "Applied",
    "capital.approve": "Approved",
    "capital.reject": "Rejected",
    "capital.disburse.request": "Disbursement requested",
    "capital.disburse.confirmed": "Disbursement confirmed",
    "capital.disburse.failed": "Disbursement failed",
    "capital.repayment.record": "Repayment recorded",
    "capital.advance.written_off": "Written off",
    "capital.advance.status": "Status changed",
    "capital.partner.rotate_secret": "Partner secret rotated",
  } as Record<string, string>)[a] ?? a;

const badgeVariant = (a: string): "default" | "secondary" | "destructive" | "outline" => {
  if (a.includes("failed") || a.includes("reject") || a.includes("written_off")) return "destructive";
  if (a.includes("confirmed") || a.includes("approve") || a.includes("repayment")) return "default";
  return "secondary";
};

const EXPORT_COLUMNS: ExportColumn<CapitalAuditEntry>[] = [
  { key: "created_at", label: "When", value: (r) => new Date(r.created_at).toISOString() },
  { key: "action", label: "Action", value: (r) => label(r.action) },
  { key: "action_code", label: "Action code", value: (r) => r.action },
  { key: "entity_type", label: "Entity", value: (r) => r.entity_type },
  { key: "entity_id", label: "Entity ID", value: (r) => r.entity_id },
  { key: "actor", label: "Actor", value: (r) => r.actor_name ?? r.actor_email ?? r.actor_user_id ?? "system" },
  { key: "metadata", label: "Details", value: (r) => (r.metadata ? JSON.stringify(r.metadata) : "") },
];

export function CapitalAuditTimeline({ applicationId }: { applicationId: string | undefined }) {
  const { data, isLoading, isError } = useCapitalAuditLog(applicationId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-muted-foreground">Couldn't load audit history.</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">No audit entries yet.</p>;
  }

  const base = `capital-application-${(applicationId ?? "unknown").slice(0, 8)}`;

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="gap-2">
              <Download className="h-3 w-3" aria-hidden="true" />
              Export history
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => downloadCsv(data, EXPORT_COLUMNS, base)}>
              Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                downloadPdfReport(data, EXPORT_COLUMNS, base, {
                  title: "SmartReach Capital — application history",
                  subtitle: `Application ${applicationId ?? "—"}`,
                  filters: [`${data.length} audit entr${data.length === 1 ? "y" : "ies"}`],
                })
              }
            >
              Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {data.map((e: CapitalAuditEntry) => (
        <Card key={e.id} className="p-3 flex gap-3 items-start">
          <History className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={badgeVariant(e.action)} className="text-xs">{label(e.action)}</Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString()}
              </span>
              {e.actor_name && (
                <span className="text-xs text-muted-foreground">
                  by <span className="font-medium">{e.actor_name}</span>
                </span>
              )}
            </div>
            {e.metadata && Object.keys(e.metadata).length > 0 && (
              <pre className="text-[11px] mt-1 text-muted-foreground whitespace-pre-wrap break-all">
                {JSON.stringify(e.metadata, null, 0)}
              </pre>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

