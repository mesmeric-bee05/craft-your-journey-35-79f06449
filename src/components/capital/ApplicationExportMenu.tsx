import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadCsv, downloadPdfReport, type ExportColumn } from "@/lib/opsExport";
import type { CapitalApplicationRow, CapitalAuditEntry } from "@/hooks/useCapital";

const AUDIT_COLUMNS: ExportColumn<CapitalAuditEntry>[] = [
  { key: "created_at", label: "When", value: (r) => new Date(r.created_at).toISOString() },
  { key: "action", label: "Action", value: (r) => r.action },
  { key: "actor", label: "Actor", value: (r) => r.actor_name ?? r.actor_email ?? "system" },
  { key: "entity_type", label: "Entity", value: (r) => r.entity_type ?? "" },
  { key: "entity_id", label: "Entity ID", value: (r) => r.entity_id ?? "" },
  { key: "metadata", label: "Details", value: (r) => (r.metadata ? JSON.stringify(r.metadata) : "") },
];

interface SummaryRow { field: string; value: string }
const SUMMARY_COLUMNS: ExportColumn<SummaryRow>[] = [
  { key: "field", label: "Field", value: (r) => r.field },
  { key: "value", label: "Value", value: (r) => r.value },
];

function summaryRows(a: CapitalApplicationRow): SummaryRow[] {
  const kes = (n: unknown) => `KES ${Math.round(Number(n ?? 0)).toLocaleString()}`;
  return [
    { field: "Application ID", value: a.id },
    { field: "Business", value: a.businesses?.name ?? "Unknown" },
    { field: "Status", value: a.status },
    { field: "Applied", value: new Date(a.created_at).toLocaleString() },
    { field: "Signed by", value: a.esign_name ?? "—" },
    { field: "Requested", value: kes(a.requested_amount_kes) },
    { field: "Factor", value: `x${a.factor}` },
    { field: "Revenue share", value: `${a.revenue_share_pct}%` },
    { field: "Total repayment", value: kes(a.total_repayment_kes) },
    { field: "SmartReach Score", value: String(a.offer_snapshot?.score ?? "—") },
    { field: "30-day GMV", value: kes(a.offer_snapshot?.monthly_gmv_kes) },
    { field: "Business age (days)", value: String(a.offer_snapshot?.business_age_days ?? 0) },
  ];
}

/** Admin-side per-application export of the Capital timeline + audit log. */
export function ApplicationExportMenu({ application }: { application: CapitalApplicationRow }) {
  const [busy, setBusy] = useState(false);
  const base = `capital-application-${application.id.slice(0, 8)}`;

  const loadAudit = async (): Promise<CapitalAuditEntry[]> => {
    const { data, error } = await supabase.rpc("get_capital_audit", {
      p_application_id: application.id,
    });
    if (error) throw error;
    return (data ?? []) as CapitalAuditEntry[];
  };

  const run = async (kind: "csv" | "pdf") => {
    setBusy(true);
    try {
      const audit = await loadAudit();
      if (kind === "csv") {
        downloadCsv(summaryRows(application), SUMMARY_COLUMNS, `${base}-summary`);
        downloadCsv(audit, AUDIT_COLUMNS, `${base}-audit`);
      } else {
        downloadPdfReport(summaryRows(application), SUMMARY_COLUMNS, `${base}-summary`, {
          title: `Capital application — ${application.businesses?.name ?? application.id}`,
          subtitle: `Status: ${application.status}`,
        });
        downloadPdfReport(audit, AUDIT_COLUMNS, `${base}-audit`, {
          title: `Capital audit log — ${application.businesses?.name ?? application.id}`,
          subtitle: `${audit.length} event(s)`,
        });
      }
      toast.success("Export ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={busy} className="gap-2">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Download className="h-3 w-3" aria-hidden="true" />}
          Export record
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Timeline &amp; audit log</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => run("csv")}>Download CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("pdf")}>Download PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
