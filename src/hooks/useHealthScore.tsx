import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";

export interface HealthScore {
  overall: number; voc_component: number; inventory_component: number;
  engagement_component: number; growth_component: number; factors: any;
  computed_at: string;
}

export function useHealthScore() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const businessId = business?.id;

  const score = useQuery({
    queryKey: ["health-score", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.from("business_health_score").select("*").eq("business_id", businessId!).maybeSingle();
      if (error) throw error;
      return data as unknown as HealthScore | null;
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("compute-health-score", { body: { business_id: businessId } });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Health score updated"); qc.invalidateQueries({ queryKey: ["health-score"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return { score, recompute };
}
