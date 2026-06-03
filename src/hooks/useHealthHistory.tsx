import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

export interface HealthSnapshot {
  snapshot_date: string;
  overall: number;
  voc_component: number;
  inventory_component: number;
  engagement_component: number;
  growth_component: number;
}

export function useHealthHistory(days = 30) {
  const { business } = useBusiness();
  const businessId = business?.id;
  return useQuery({
    queryKey: ["health-history", businessId, days],
    enabled: !!businessId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("business_health_score_history").select("*")
        .eq("business_id", businessId!)
        .gte("snapshot_date", since)
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as HealthSnapshot[];
    },
  });
}
