import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CronRun {
  id: string;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "success" | "failure";
  rows_affected: number | null;
  duration_ms: number | null;
  error_text: string | null;
  metadata: Record<string, unknown>;
  total_count: number;
}

export interface CronRunsFilters {
  jobName?: string | null;
  status?: string | null;
  sinceHours?: number | null;
  search?: string | null;
  limit?: number;
  offset?: number;
}

export function useCronRunsTimeline(f: CronRunsFilters = {}) {
  const limit = f.limit ?? 50;
  const offset = f.offset ?? 0;
  return useQuery({
    queryKey: ["cron-runs-timeline", f],
    queryFn: async () => {
      const since = f.sinceHours
        ? new Date(Date.now() - f.sinceHours * 3600_000).toISOString()
        : null;
      const { data, error } = await supabase.rpc("get_cron_runs_timeline" as never, {
        p_limit: limit,
        p_offset: offset,
        p_job_name: f.jobName ?? null,
        p_status: f.status ?? null,
        p_since: since,
        p_search: f.search ?? null,
      } as never);
      if (error) throw error;
      return (data ?? []) as unknown as CronRun[];
    },
    staleTime: 30_000,
  });
}
