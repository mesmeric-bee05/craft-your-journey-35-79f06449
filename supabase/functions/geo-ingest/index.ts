import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Body = z.object({
  business_id: z.string().uuid(),
  query: z.string().min(2).max(120),
  near: z.object({ lat: z.number(), lng: z.number() }).optional(),
  entity_type: z.enum(["competitor", "supplier", "customer_cluster", "event", "landmark"]).default("competitor"),
  geo_label: z.string().max(60).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);
    const { business_id, query, near, entity_type, geo_label } = parsed.data;

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) return json({ error: "Maps key not configured" }, 500);

    const params = new URLSearchParams({ query, key: apiKey });
    if (near) params.set("location", `${near.lat},${near.lng}`);
    if (near) params.set("radius", "10000");
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
    const resp = await fetch(url);
    const data = await resp.json();
    const results = (data.results ?? []).slice(0, 10).map((r: any) => ({
      name: r.name,
      lat: r.geometry?.location?.lat,
      lng: r.geometry?.location?.lng,
      address: r.formatted_address,
      rating: r.rating,
      place_id: r.place_id,
    })).filter((r: any) => r.lat && r.lng);

    if (results.length === 0) return json({ inserted: 0, results: [] });

    const rows = results.map((r: any) => ({
      business_id, entity_type, name: r.name, lat: r.lat, lng: r.lng,
      geo_label: geo_label ?? null, source: "google_places",
      metadata: { address: r.address, rating: r.rating, place_id: r.place_id },
      created_by: user.id,
    }));

    const { data: ins, error } = await supa.from("geo_entities").insert(rows).select("id");
    if (error) return json({ error: error.message }, 400);
    return json({ inserted: ins?.length ?? 0, results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
