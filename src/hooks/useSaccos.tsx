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

export interface CsvMemberRow {
  external_member_id?: string;
  full_name: string;
  phone?: string;
  email?: string;
  joined_at?: string;
}

export interface CsvImportResult {
  created: number;
  updated: number;
  errors: Array<{ row: number; error: string }>;
}

export function normalizePhone(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("254")) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+254" + digits.slice(1);
  return digits.length >= 9 ? "+" + digits : null;
}

export type RowStatus = "valid" | "warning" | "error";
export interface ValidatedRow {
  rowNumber: number;
  raw: CsvMemberRow;
  normalizedPhone: string | null;
  status: RowStatus;
  reasons: string[];
}

export function validateCsvRows(rows: CsvMemberRow[]): {
  validated: ValidatedRow[];
  valid: ValidatedRow[];
  warnings: ValidatedRow[];
  errors: ValidatedRow[];
  duplicatesSkipped: number;
} {
  const seenExternal = new Set<string>();
  const seenPhone = new Set<string>();
  let duplicatesSkipped = 0;

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validated: ValidatedRow[] = rows.map((r, i) => {
    const reasons: string[] = [];
    let status: RowStatus = "valid";

    const name = (r.full_name ?? "").trim();
    if (!name) reasons.push("Missing full_name");
    else if (name.length > 120) reasons.push("full_name > 120 chars");

    const phone = normalizePhone(r.phone);
    if (r.phone && !phone) reasons.push(`Invalid phone: ${r.phone}`);

    if (r.email) {
      const e = r.email.trim();
      if (e.length > 255) reasons.push("email > 255 chars");
      else if (!emailRe.test(e)) reasons.push(`Invalid email: ${e}`);
    }

    if (r.joined_at) {
      const d = new Date(r.joined_at);
      if (isNaN(d.getTime())) reasons.push(`Invalid joined_at: ${r.joined_at}`);
    }

    if (r.external_member_id && r.external_member_id.length > 64) {
      reasons.push("external_member_id > 64 chars");
    }

    if (reasons.length > 0 && reasons.some((x) => x.startsWith("Missing") || x.includes("Invalid") || x.includes(">"))) {
      status = "error";
    }

    // Dedupe (only for otherwise-valid rows)
    if (status !== "error") {
      const key = r.external_member_id?.trim();
      if (key) {
        if (seenExternal.has(key)) {
          duplicatesSkipped++;
          status = "warning";
          reasons.push(`Duplicate external_member_id: ${key}`);
        } else seenExternal.add(key);
      } else if (phone) {
        if (seenPhone.has(phone)) {
          duplicatesSkipped++;
          status = "warning";
          reasons.push(`Duplicate phone: ${phone}`);
        } else seenPhone.add(phone);
      }
    }

    return { rowNumber: i + 2, raw: r, normalizedPhone: phone, status, reasons };
  });

  return {
    validated,
    valid: validated.filter((v) => v.status === "valid"),
    warnings: validated.filter((v) => v.status === "warning"),
    errors: validated.filter((v) => v.status === "error"),
    duplicatesSkipped,
  };
}

export function useImportSaccoMembersCSV() {
  const qc = useQueryClient();
  return useMutation<CsvImportResult, Error, { saccoId: string; rows: ValidatedRow[] }>({
    mutationFn: async (input) => {
      const imp = await supabase
        .from("sacco_imports")
        .insert({ sacco_id: input.saccoId, source: "csv", row_count: input.rows.length })
        .select("id").single();
      if (imp.error) throw imp.error;

      const errors: Array<{ row: number; error: string }> = [];
      let created = 0;
      const updated = 0;

      const batchSize = 100;
      for (let i = 0; i < input.rows.length; i += batchSize) {
        const slice = input.rows.slice(i, i + batchSize);
        const batch = slice.map((v) => ({
          sacco_id: input.saccoId,
          external_member_id: v.raw.external_member_id?.trim() || `csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          full_name: v.raw.full_name.trim(),
          phone: v.normalizedPhone,
          email: v.raw.email?.trim() || null,
          joined_at: v.raw.joined_at || null,
          status: "imported" as const,
        }));

        const { error, count } = await supabase
          .from("sacco_members")
          .upsert(batch, { onConflict: "sacco_id,external_member_id", count: "exact" });
        if (error) {
          slice.forEach((v) => errors.push({ row: v.rowNumber, error: error.message }));
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
      toast.success(`Imported ${res.created} · Failed ${res.errors.length}`);
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
