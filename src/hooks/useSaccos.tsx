import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Sacco {
  id: string;
  name: string;
  registration_no: string | null;
  county: string | null;
  region: string | null;
  member_count_estimate: number;
  loi_status: "none" | "signed" | "active";
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  tier: "starter" | "growth" | "enterprise";
  api_key_last4: string | null;
  api_key_issued_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSaccos(search?: string, county?: string) {
  return useQuery({
    queryKey: ["saccos", { search, county }],
    queryFn: async () => {
      let q = supabase.from("saccos").select("*").order("name", { ascending: true });
      if (search) q = q.ilike("name", `%${search}%`);
      if (county) q = q.eq("county", county);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Sacco[];
    },
    staleTime: 30_000,
  });
}

export function useSacco(id: string | undefined) {
  return useQuery({
    queryKey: ["sacco", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("saccos").select("*").eq("id", id!).single();
      if (error) throw error;
      return data as Sacco;
    },
  });
}

export function useSaccoMembers(saccoId: string | undefined, limit = 100) {
  return useQuery({
    queryKey: ["sacco-members", saccoId, limit],
    enabled: !!saccoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sacco_members")
        .select("*")
        .eq("sacco_id", saccoId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSaccoImports(saccoId: string | undefined) {
  return useQuery({
    queryKey: ["sacco-imports", saccoId],
    enabled: !!saccoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sacco_imports")
        .select("*")
        .eq("sacco_id", saccoId!)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateSacco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Sacco> & { name: string }) => {
      const { data, error } = await supabase.from("saccos").insert(input).select().single();
      if (error) throw error;
      return data as Sacco;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["saccos"] });
      toast.success("SACCO added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSacco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Sacco> & { id: string }) => {
      const { data, error } = await supabase.from("saccos").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data as Sacco;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["saccos"] });
      qc.invalidateQueries({ queryKey: ["sacco", vars.id] });
      toast.success("SACCO updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useImportSaccoMembersCSV() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      saccoId: string;
      rows: Array<{
        external_member_id?: string;
        full_name: string;
        phone?: string;
        email?: string;
        joined_at?: string;
      }>;
    }) => {
      // Create import log
      const imp = await supabase
        .from("sacco_imports")
        .insert({
          sacco_id: input.saccoId,
          source: "csv",
          row_count: input.rows.length,
        })
        .select("id")
        .single();
      if (imp.error) throw imp.error;

      const errors: Array<{ row: number; error: string }> = [];
      let created = 0;
      let updated = 0;

      // Normalize phone
      const norm = (raw?: string) => {
        if (!raw) return null;
        const digits = raw.replace(/[^\d+]/g, "");
        if (digits.startsWith("+")) return digits;
        if (digits.startsWith("254")) return "+" + digits;
        if (digits.startsWith("0") && digits.length === 10) return "+254" + digits.slice(1);
        return digits.length >= 9 ? "+" + digits : null;
      };

      // Batch upsert 100 at a time
      const batchSize = 100;
      for (let i = 0; i < input.rows.length; i += batchSize) {
        const batch = input.rows.slice(i, i + batchSize).map((r) => ({
          sacco_id: input.saccoId,
          external_member_id: r.external_member_id || `csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          full_name: r.full_name,
          phone: norm(r.phone),
          email: r.email || null,
          joined_at: r.joined_at || null,
          status: "imported" as const,
        }));

        const { error, count } = await supabase
          .from("sacco_members")
          .upsert(batch, { onConflict: "sacco_id,external_member_id", count: "exact" });
        if (error) {
          batch.forEach((_, idx) => errors.push({ row: i + idx, error: error.message }));
        } else {
          created += count ?? batch.length;
        }
      }

      await supabase
        .from("sacco_imports")
        .update({
          created_count: created,
          updated_count: updated,
          error_count: errors.length,
          errors,
          finished_at: new Date().toISOString(),
        })
        .eq("id", imp.data.id);

      return { created, updated, errors };
    },
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ["sacco-members", vars.saccoId] });
      qc.invalidateQueries({ queryKey: ["sacco-imports", vars.saccoId] });
      toast.success(`Imported ${res.created} members (${res.errors.length} errors)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useIssueSaccoApiKey() {
  return useMutation({
    mutationFn: async (saccoId: string) => {
      const { data, error } = await supabase.functions.invoke("sacco-issue-api-key", {
        body: { sacco_id: saccoId },
      });
      if (error) throw error;
      return data as { api_key: string; last4: string; warning: string };
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
