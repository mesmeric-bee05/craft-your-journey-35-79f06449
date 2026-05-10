import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";

export interface PublicProfile {
  id: string; business_id: string; slug: string; tagline: string | null;
  hero_image_url: string | null; is_published: boolean;
  show_health_score: boolean; show_voc_highlights: boolean; show_bundles: boolean;
  view_count: number;
}

export function usePublicProfile() {
  const { business } = useBusiness();
  const qc = useQueryClient();
  const businessId = business?.id;

  const profile = useQuery({
    queryKey: ["public-profile", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase.from("business_public_profiles").select("*").eq("business_id", businessId!).maybeSingle();
      if (error) throw error;
      return data as unknown as PublicProfile | null;
    },
  });

  const checkSlug = async (slug: string) => {
    const s = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(s)) return false;
    const { data } = await supabase.rpc("is_business_slug_available" as any, { p_slug: s });
    return Boolean(data);
  };

  const upsert = useMutation({
    mutationFn: async (p: Partial<PublicProfile> & { slug: string }) => {
      const slug = p.slug.trim().toLowerCase();
      if (profile.data?.slug !== slug) {
        const ok = await checkSlug(slug);
        if (!ok) throw new Error("Slug is taken or invalid");
      }
      const payload: any = { ...p, slug, business_id: businessId };
      const { error } = profile.data
        ? await supabase.from("business_public_profiles").update(payload).eq("business_id", businessId!)
        : await supabase.from("business_public_profiles").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile saved"); qc.invalidateQueries({ queryKey: ["public-profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return { profile, upsert, checkSlug };
}

export function usePublicProfileBySlug(slug?: string) {
  return useQuery({
    queryKey: ["public-profile-view", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_business_profile" as any, { p_slug: slug });
      if (error) throw error;
      return data as any;
    },
  });
}
