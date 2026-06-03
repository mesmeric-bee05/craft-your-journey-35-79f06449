import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BundleItem {
  id: string;
  bundle_id: string;
  product_id: string;
  quantity: number;
  unit_price_kes: number;
  is_optional: boolean;
  sort_order: number;
}

export function useBundleItems(bundleId: string | undefined) {
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ["bundle-items", bundleId],
    enabled: !!bundleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bundle_items").select("*").eq("bundle_id", bundleId!).order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as BundleItem[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (item: Partial<BundleItem> & { bundle_id: string; product_id: string }) => {
      const { error } = item.id
        ? await supabase.from("bundle_items").update(item as any).eq("id", item.id)
        : await supabase.from("bundle_items").insert(item as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bundle-items", bundleId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bundle_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bundle-items", bundleId] }),
  });

  return { items, upsert, remove };
}
