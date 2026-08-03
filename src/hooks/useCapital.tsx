import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OfferSnapshot {
  score?: number;
  monthly_gmv_kes?: number;
  business_age_days?: number;
  [k: string]: unknown;
}

export interface CapitalApplicationRow {
  id: string;
  business_id: string;
  requested_amount_kes: number;
  revenue_share_pct: number;
  factor: number;
  total_repayment_kes: number;
  status: "submitted" | "under_review" | "approved" | "rejected" | "cancelled";
  created_at: string;
  esign_name: string | null;
  offer_snapshot: OfferSnapshot | null;
  businesses: { name: string } | null;
}

export interface CapitalOffer {
  eligible: boolean;
  score: number;
  monthly_gmv_kes: number;
  business_age_days: number;
  max_advance_kes: number;
  factor: number | null;
  revenue_share_min_pct: number | null;
  revenue_share_max_pct: number | null;
  reason: string | null;
}

export function useCapitalOffer(businessId: string | undefined) {
  return useQuery({
    queryKey: ["capital-offer", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("compute_capital_offer", { p_business_id: businessId! });
      if (error) throw error;
      return data as unknown as CapitalOffer;
    },
    staleTime: 60_000,
  });
}

export function useMyAdvance(businessId: string | undefined) {
  return useQuery({
    queryKey: ["capital-advance", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_advances")
        .select("*")
        .eq("business_id", businessId!)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMyApplications(businessId: string | undefined) {
  return useQuery({
    queryKey: ["capital-applications", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_applications")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdvanceRepayments(advanceId: string | undefined) {
  return useQuery({
    queryKey: ["capital-repayments", advanceId],
    enabled: !!advanceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_repayments")
        .select("*")
        .eq("advance_id", advanceId!)
        .order("scheduled_for", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useApplyForCapital() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      business_id: string;
      requested_amount: number;
      revenue_share_pct: number;
      esign_name: string;
    }) => {
      const { data, error } = await supabase.rpc("apply_for_capital", {
        p_business_id: input.business_id,
        p_requested_amount: input.requested_amount,
        p_revenue_share_pct: input.revenue_share_pct,
        p_esign_name: input.esign_name,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["capital-applications", vars.business_id] });
      qc.invalidateQueries({ queryKey: ["capital-admin"] });
      toast.success("Application submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCapitalAdminQueue() {
  return useQuery({
    queryKey: ["capital-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_applications")
        .select("*, businesses(name)")
        .in("status", ["submitted", "under_review"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CapitalApplicationRow[];
    },
  });
}

export function useApproveApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; note?: string }) => {
      const { data, error } = await supabase.rpc("approve_capital_application", {
        p_application_id: input.id,
        p_note: input.note ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital-admin"] });
      toast.success("Approved and advance created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRejectApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; note: string }) => {
      const { error } = await supabase.rpc("reject_capital_application", {
        p_application_id: input.id,
        p_note: input.note,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital-admin"] });
      toast.info("Application rejected");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRecordRepayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { advance_id: string; amount: number; reference?: string }) => {
      const { error } = await supabase.rpc("record_capital_repayment", {
        p_advance_id: input.advance_id,
        p_amount: input.amount,
        p_reference: input.reference ?? null,
        p_source: "manual",
        p_partner_id: null,
        p_checkout_request_id: null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["capital-repayments", vars.advance_id] });
      qc.invalidateQueries({ queryKey: ["capital-advance"] });
      toast.success("Repayment recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface CapitalAuditEntry {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
}

export function useCapitalAuditLog(applicationId: string | undefined) {
  return useQuery({
    queryKey: ["capital-audit", applicationId],
    enabled: !!applicationId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_capital_audit", { p_application_id: applicationId! });
      if (error) throw error;
      return (data ?? []) as unknown as CapitalAuditEntry[];
    },
    staleTime: 15_000,
  });
}

export function useAdminAuditFeed(limit: number = 200) {
  return useQuery({
    queryKey: ["capital-audit-feed", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string; action: string; entity_type: string | null; entity_id: string | null;
        business_id: string | null; actor_user_id: string | null;
        metadata: Record<string, unknown>; created_at: string;
      }>;
    },
    staleTime: 15_000,
  });
}

export function useDisburseAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (advance_id: string) => {
      const { data, error } = await supabase.functions.invoke("mpesa-b2c-disburse", {
        body: { advance_id },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error?.message ?? (data as any)?.error ?? "Disbursement failed");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital-admin"] });
      qc.invalidateQueries({ queryKey: ["capital-audit"] });
      toast.success("Disbursement initiated — awaiting M-Pesa confirmation");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRotatePartnerSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (partnerId: string) => {
      const { data, error } = await supabase.rpc("rotate_capital_partner_secret", { p_partner_id: partnerId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital-partners"] });
      toast.success("New secret generated — copy it now, it will not be shown again");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCapitalPartners() {
  return useQuery({
    queryKey: ["capital-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("capital_partners")
        .select("id, name, kind, webhook_url, is_active, last_event_at, webhook_secret_hash, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ---------- Ops: webhook events, failed disbursements, retry actions ----------

export interface CapitalWebhookEventRow {
  id: string;
  partner_id: string | null;
  event: string;
  advance_id: string | null;
  headers: Record<string, unknown>;
  body: Record<string, unknown>;
  sig_valid: boolean;
  status: string;
  error: string | null;
  processed_at: string | null;
  created_at: string;
  dedupe_key: string | null;
}


export function useCapitalWebhookEvents(limit = 100) {
  return useQuery({
    queryKey: ["capital-webhook-events", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_webhook_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as CapitalWebhookEventRow[];
    },
    staleTime: 15_000,
  });
}

export interface FailedDisbursementRow {
  id: string;
  business_id: string;
  principal_kes: number;
  disbursement_status: string;
  disbursement_error: string | null;
  disbursement_requested_at: string | null;
  businesses: { name: string } | null;
}

export function useFailedDisbursements() {
  return useQuery({
    queryKey: ["capital-failed-disbursements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_advances")
        .select("id, business_id, principal_kes, disbursement_status, disbursement_error, disbursement_requested_at, businesses(name)")
        .in("disbursement_status", ["failed", "processing"])
        .order("disbursement_requested_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as FailedDisbursementRow[];
    },
    staleTime: 15_000,
  });
}

export function useRetryDisbursement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (advance_id: string) => {
      const { data, error } = await supabase.functions.invoke("capital-ops-admin", {
        body: { action: "retry_disbursement", advance_id },
      });
      if (error) throw error;
      if (!(data as { ok?: boolean })?.ok) {
        throw new Error((data as { result?: { error?: string } })?.result?.error ?? "Retry failed");
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital-failed-disbursements"] });
      qc.invalidateQueries({ queryKey: ["capital-admin"] });
      toast.success("Disbursement retry initiated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useReprocessWebhookEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event_id: string) => {
      const { data, error } = await supabase.functions.invoke("capital-ops-admin", {
        body: { action: "reprocess_webhook", event_id },
      });
      if (error) throw error;
      if (!(data as { ok?: boolean })?.ok) {
        throw new Error((data as { detail?: string })?.detail ?? "Reprocess failed");
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capital-webhook-events"] });
      toast.success("Event reprocessed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useTriggerRepaymentCron() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("capital-ops-admin", {
        body: { action: "trigger_repayment_cron" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["capital-failed-disbursements"] });
      const processed = (data as { result?: { processed?: number } })?.result?.processed ?? 0;
      toast.success(`Repayment cron ran — ${processed} advance(s) processed`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}


