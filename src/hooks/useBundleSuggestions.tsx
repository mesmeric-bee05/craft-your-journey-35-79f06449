import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";

export interface BundleSuggestion {
  id: string;
  business_id: string;
  product_ids: string[];
  score: number;
  rationale: string | null;
  source: string;
  is_dismissed: boolean;
  computed_at: string;
}

export function useBundleSuggestions() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const businessId = business?.id;

  const suggestions = useQuery({
    queryKey: ["bundle-suggestions", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundle_suggestions").select("*")
        .eq("business_id", businessId!).eq("is_dismissed", false)
        .order("score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BundleSuggestion[];
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("compute-bundle-suggestions", {
        body: { business_id: businessId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Suggestions refreshed");
      qc.invalidateQueries({ queryKey: ["bundle-suggestions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bundle_suggestions").update({ is_dismissed: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bundle-suggestions"] }),
  });

  return { suggestions, recompute, dismiss };
}
