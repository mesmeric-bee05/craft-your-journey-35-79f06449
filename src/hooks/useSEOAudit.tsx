import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SEOAuditRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "failure";
  total_routes: number;
  failing_routes: number;
  total_findings: number;
  metadata: Record<string, unknown>;
}

export interface SEOAuditFinding {
  id: string;
  route: string;
  check_name: string;
  severity: "info" | "warn" | "error";
  message: string;
  evidence: Record<string, unknown>;
  created_at: string;
}

export function useSEOAuditRuns(limit = 20) {
  return useQuery({
    queryKey: ["seo-audit-runs", limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_seo_audit_summary" as never, { p_limit: limit } as never);
      if (error) throw error;
      return (data ?? []) as unknown as SEOAuditRun[];
    },
    refetchInterval: 60_000,
  });
}

export function useSEOAuditFindings(runId: string | null) {
  return useQuery({
    queryKey: ["seo-audit-findings", runId],
    enabled: !!runId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_seo_audit_findings" as never, { p_run_id: runId } as never);
      if (error) throw error;
      return (data ?? []) as unknown as SEOAuditFinding[];
    },
  });
}

export function useRunSEOAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("trigger-cron-job", { body: { job: "seo-route-audit" } });
      if (error) {
        const ctx: any = (error as any).context;
        try {
          const body = ctx?.body ? JSON.parse(ctx.body) : null;
          if (body?.error === "rate_limit_exceeded") {
            const mins = Math.ceil((body.retryAfterSeconds ?? 3600) / 60);
            throw new Error(`Rate limit hit. Try again in ~${mins} min.`);
          }
        } catch (_) {
          // The function error remains the authoritative failure response.
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("SEO audit started");
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["seo-audit-runs"] });
        qc.invalidateQueries({ queryKey: ["cron-runs-timeline"] });
      }, 2000);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to start audit"),
  });
}

export function useResubmitSitemap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("trigger-cron-job", { body: { job: "gsc-submit-sitemap" } });
      if (error) {
        const ctx: any = (error as any).context;
        try {
          const body = ctx?.body ? JSON.parse(ctx.body) : null;
          if (body?.error === "rate_limit_exceeded") {
            const mins = Math.ceil((body.retryAfterSeconds ?? 3600) / 60);
            throw new Error(`Rate limit hit. Try again in ~${mins} min.`);
          }
        } catch (_) {
          // The function error remains the authoritative failure response.
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Sitemap resubmission dispatched");
      setTimeout(() => qc.invalidateQueries({ queryKey: ["cron-runs-timeline"] }), 1500);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to resubmit sitemap"),
  });
}
