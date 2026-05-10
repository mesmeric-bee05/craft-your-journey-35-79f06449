import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface BusinessLocation {
  id: string; business_id: string; name: string; address: string | null;
  lat: number; lng: number; geo_label: string | null;
  service_radius_km: number; is_primary: boolean;
}
export interface GeoEntity {
  id: string; business_id: string; entity_type: string; name: string;
  lat: number; lng: number; geo_label: string | null; source: string;
  metadata: any;
}
export interface GeoInsight {
  date: string; geo_label: string; customer_count: number;
  avg_sentiment: number | null; competitor_density: number; opportunity_score: number;
}

export interface GeoFilters {
  radiusKm: number;
  geoLabels: string[];
  entityTypes: string[];
  days: number;
}

export function useGeoIntel(filters: GeoFilters) {
  const { business } = useBusiness();
  const { user } = useAuth();
  const qc = useQueryClient();
  const businessId = business?.id;

  const locations = useQuery({
    queryKey: ["geo-locations", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.from("business_locations").select("*").eq("business_id", businessId!).order("is_primary", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BusinessLocation[];
    },
  });

  const entities = useQuery({
    queryKey: ["geo-entities", businessId, filters.entityTypes, filters.geoLabels],
    enabled: !!businessId,
    queryFn: async () => {
      let q = supabase.from("geo_entities").select("*").eq("business_id", businessId!);
      if (filters.entityTypes.length) q = q.in("entity_type", filters.entityTypes as any);
      if (filters.geoLabels.length) q = q.in("geo_label", filters.geoLabels);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as GeoEntity[];
    },
  });

  const insights = useQuery({
    queryKey: ["geo-insights", businessId, filters.days, filters.geoLabels],
    enabled: !!businessId,
    queryFn: async () => {
      const since = new Date(Date.now() - filters.days * 86400000).toISOString().slice(0, 10);
      let q = supabase.from("geo_insights_daily").select("*").eq("business_id", businessId!).gte("date", since);
      if (filters.geoLabels.length) q = q.in("geo_label", filters.geoLabels);
      const { data, error } = await q.order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as GeoInsight[];
    },
  });

  const upsertLocation = useMutation({
    mutationFn: async (loc: Partial<BusinessLocation> & { name: string; lat: number; lng: number }) => {
      const payload: any = { ...loc, business_id: businessId, created_by: user!.id };
      const { error } = loc.id
        ? await supabase.from("business_locations").update(payload).eq("id", loc.id).eq("business_id", businessId!)
        : await supabase.from("business_locations").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Location saved"); qc.invalidateQueries({ queryKey: ["geo-locations"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteEntity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("geo_entities").delete().eq("id", id).eq("business_id", businessId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["geo-entities"] }),
  });

  const addEntity = useMutation({
    mutationFn: async (e: { name: string; lat: number; lng: number; entity_type: string; geo_label?: string }) => {
      const { error } = await supabase.from("geo_entities").insert({ ...e, business_id: businessId, created_by: user!.id, source: "manual" } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Entity added"); qc.invalidateQueries({ queryKey: ["geo-entities"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const ingestPlaces = useMutation({
    mutationFn: async (input: { query: string; near?: { lat: number; lng: number }; entity_type?: string; geo_label?: string }) => {
      const { data, error } = await supabase.functions.invoke("geo-ingest", { body: { business_id: businessId, ...input } });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => { toast.success(`Imported ${d.inserted} places`); qc.invalidateQueries({ queryKey: ["geo-entities"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return { locations, entities, insights, upsertLocation, deleteEntity, addEntity, ingestPlaces };
}

export function useMapsBrowserKey() {
  return useQuery({
    queryKey: ["maps-config"],
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-maps-config");
      if (error) throw error;
      return (data as any).browserKey as string;
    },
  });
}
