import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CronHealth {
  job_name: string;
  last_run_at: string | null;
  last_success_at: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  last_error: string | null;
  minutes_since_success: number | null;
  expected_interval_minutes: number;
  is_stale: boolean;
}

export function useCronHealth() {
  const qc = useQueryClient();

  const health = useQuery({
    queryKey: ["cron-health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_cron_health" as never);
      if (error) throw error;
      return (data ?? []) as unknown as CronHealth[];
    },
    refetchInterval: 60_000,
  });

  const runs = useQuery({
    queryKey: ["cron-job-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cron_job_runs" as never)
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const trigger = useMutation({
    mutationFn: async (job: "snapshot-health-scores" | "security-rescan-runner") => {
      const { data, error } = await supabase.functions.invoke("trigger-cron-job", { body: { job } });
      if (error) {
        // Surface 429 body when present
        const ctx: any = (error as any).context;
        try {
          const body = ctx?.body ? JSON.parse(ctx.body) : null;
          if (body?.error === "rate_limit_exceeded") {
            const mins = Math.ceil((body.retryAfterSeconds ?? 3600) / 60);
            throw new Error(`Rate limit hit (${body.maxPerHour}/hr). Try again in ~${mins} min.`);
          }
        } catch (_) { /* fall through */ }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Job dispatched");
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["cron-health"] });
        qc.invalidateQueries({ queryKey: ["cron-job-runs"] });
        qc.invalidateQueries({ queryKey: ["cron-runs-timeline"] });
        qc.invalidateQueries({ queryKey: ["security-findings"] });
      }, 1500);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to run job"),
  });

  return { health, runs, trigger };
}
