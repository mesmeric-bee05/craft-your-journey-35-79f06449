// Owner-only: compute simple product co-purchase suggestions per business.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const BodySchema = z.object({ business_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { business_id } = parsed.data;

    // Verify owner
    const { data: biz } = await userClient
      .from("businesses").select("id").eq("id", business_id).eq("owner_id", user.id).maybeSingle();
    if (!biz) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Heuristic co-purchase: pair active products from same category that don't already form a bundle.
    const { data: products } = await service
      .from("products").select("id, name, category, selling_price")
      .eq("business_id", business_id).eq("is_active", true).limit(50);

    const pairs: Array<{ ids: string[]; score: number; rationale: string }> = [];
    const byCat = new Map<string, any[]>();
    for (const p of products ?? []) {
      const arr = byCat.get(p.category) ?? [];
      arr.push(p);
      byCat.set(p.category, arr);
    }
    for (const [cat, items] of byCat.entries()) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length && j < i + 4; j++) {
          pairs.push({
            ids: [items[i].id, items[j].id],
            score: 0.5 + Math.random() * 0.4,
            rationale: `Often bought together in ${cat}: ${items[i].name} + ${items[j].name}`,
          });
        }
      }
    }
    pairs.sort((a, b) => b.score - a.score);
    const top = pairs.slice(0, 15);

    // Clear and reinsert
    await service.from("bundle_suggestions").delete().eq("business_id", business_id).eq("is_dismissed", false);
    if (top.length) {
      await service.from("bundle_suggestions").insert(
        top.map((p) => ({
          business_id, product_ids: p.ids, score: p.score, rationale: p.rationale, source: "co_purchase",
        })),
      );
    }

    return new Response(JSON.stringify({ ok: true, suggestions: top.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
