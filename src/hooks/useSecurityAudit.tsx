import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SecurityAuditEvent {
  id: string;
  action: string;
  actor_user_id: string | null;
  actor_label: string | null;
  finding_id: string | null;
  finding_internal_id: string | null;
  scanner_name: string | null;
  old_status: string | null;
  new_status: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SecurityAdminNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  event_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface LatestScanRun {
  id: string;
  check_type: string;
  environment: string;
  status: string;
  summary: string | null;
  created_at: string;
  ran_by: string | null;
}

/** Admin-only audit trail of who triggered scans and changed finding statuses. */
export function useSecurityAuditEvents(limit = 200) {
  return useQuery({
    queryKey: ["security-audit-events", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_audit_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as SecurityAuditEvent[];
    },
    refetchInterval: 60_000,
  });
}

/** Latest scan run per check type, so the health tab can show statuses + timestamps. */
export function useLatestScanRuns() {
  return useQuery({
    queryKey: ["security-latest-scan-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_check_runs")
        .select("id, check_type, environment, status, summary, created_at, ran_by")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      const rows = (data ?? []) as unknown as LatestScanRun[];
      const latest = new Map<string, LatestScanRun>();
      for (const r of rows) if (!latest.has(r.check_type)) latest.set(r.check_type, r);
      return { latest: [...latest.values()], recent: rows };
    },
    refetchInterval: 60_000,
  });
}

export function useSecurityNotifications() {
  const qc = useQueryClient();

  const notifications = useQuery({
    queryKey: ["security-admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as SecurityAdminNotification[];
    },
    refetchInterval: 45_000,
  });

  const markRead = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("security_admin_notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["security-admin-notifications"] }),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not update alerts"),
  });

  const unreadCount = (notifications.data ?? []).filter((n) => !n.read_at).length;

  return { notifications, markRead, unreadCount };
}

/** Records who asked for a scan before the job is dispatched. */
export function useLogScanTrigger() {
  return useMutation({
    mutationFn: async (jobName: string) => {
      const { error } = await supabase.rpc("log_security_scan_trigger", {
        p_job_name: jobName,
        p_note: "Triggered from the admin System Health tab",
      });
      if (error) throw error;
    },
  });
}
