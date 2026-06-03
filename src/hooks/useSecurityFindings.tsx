import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SecurityFinding {
  id: string;
  scanner_name: string;
  finding_internal_id: string;
  name: string;
  description: string | null;
  severity: string;
  status: "open" | "fixed" | "ignored";
  resolution_note: string | null;
  remediation_link: string | null;
  commit_sha: string | null;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  metadata: Record<string, unknown>;
}

export function useSecurityFindings(status?: "open" | "fixed" | "ignored") {
  const qc = useQueryClient();

  const findings = useQuery({
    queryKey: ["security-findings", status ?? "all"],
    queryFn: async () => {
      let q = supabase.from("security_findings").select("*").order("detected_at", { ascending: false }).limit(500);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SecurityFinding[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async (p: { id: string; status: SecurityFinding["status"]; note: string }) => {
      const { error } = await supabase.from("security_findings").update({
        status: p.status,
        resolution_note: p.note,
        resolved_at: p.status === "open" ? null : new Date().toISOString(),
      }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Finding updated");
      qc.invalidateQueries({ queryKey: ["security-findings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { findings, setStatus };
}
