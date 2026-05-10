import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Bundle {
  id: string; business_id: string; name: string; description: string | null;
  items: any[]; price_kes: number; is_active: boolean; display_on_profile: boolean;
}

export function useBundles() {
  const { business } = useBusiness();
  const { user } = useAuth();
  const qc = useQueryClient();
  const businessId = business?.id;

  const bundles = useQuery({
    queryKey: ["bundles", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.from("bundles").select("*").eq("business_id", businessId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Bundle[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (b: Partial<Bundle>) => {
      const payload: any = { ...b, business_id: businessId, created_by: user!.id };
      const { error } = b.id
        ? await supabase.from("bundles").update(payload).eq("id", b.id).eq("business_id", businessId!)
        : await supabase.from("bundles").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Bundle saved"); qc.invalidateQueries({ queryKey: ["bundles"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bundles").delete().eq("id", id).eq("business_id", businessId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bundles"] }),
  });

  return { bundles, upsert, remove };
}
