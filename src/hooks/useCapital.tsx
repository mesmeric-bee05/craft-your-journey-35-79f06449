import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      return data ?? [];
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
