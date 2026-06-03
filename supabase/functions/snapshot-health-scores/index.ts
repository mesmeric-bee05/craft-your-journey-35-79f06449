// Nightly snapshot of every business health score. Service-role only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Simple shared-secret guard for manual + cron invocations
  const secret = Deno.env.get("SNAPSHOT_HEALTH_SECRET");
  const provided = req.headers.get("x-snapshot-secret");
  if (secret && provided !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Recompute scores for every active business, then snapshot.
    const { data: businesses, error: bErr } = await supabase
      .from("businesses").select("id");
    if (bErr) throw bErr;

    let recomputed = 0;
    for (const b of businesses ?? []) {
      const { error } = await supabase.rpc("compute_business_health_score", { p_business_id: b.id });
      if (!error) recomputed++;
    }

    const { data: snapped, error: sErr } = await supabase.rpc("snapshot_all_health_scores");
    if (sErr) throw sErr;

    return new Response(
      JSON.stringify({ ok: true, recomputed, snapshotted: snapped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
