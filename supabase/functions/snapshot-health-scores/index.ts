// Nightly snapshot of every business health score. Service-role only.
// Logs every run into public.cron_job_runs and alerts admins (Slack + audit) on failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { notifyCronFailure } from "../_shared/cron-alerts.ts";

const JOB = "snapshot-health-scores";

async function logRun(svc: any, status: "success" | "failure", extra: Record<string, unknown>) {
  try {
    await svc.from("cron_job_runs").insert({
      job_name: JOB,
      finished_at: new Date().toISOString(),
      status,
      ...extra,
    });
  } catch (_) { /* ignore */ }
}

async function alertFailure(svc: any, message: string, startedAt: string, durationMs: number) {
  const base = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SECURITY_ALERT_SHARED_SECRET");
  if (base && secret) {
    try {
      await fetch(`${base}/functions/v1/security-alert`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-alert-secret": secret },
        body: JSON.stringify({
          check_type: "rpc_roles",
          status: "fail",
          environment: Deno.env.get("SECURITY_CHECK_ENV") ?? "production",
          summary: `${JOB} failed: ${message}`.slice(0, 1900),
        }),
      });
    } catch (_) { /* ignore */ }
  }
  await notifyCronFailure(svc, {
    jobName: JOB,
    status: "failure",
    errorText: message,
    startedAt,
    durationMs,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const start = Date.now();
  // Fail-closed: SNAPSHOT_HEALTH_SECRET must be configured and the caller must present it.
  const secret = Deno.env.get("SNAPSHOT_HEALTH_SECRET");
  const provided = req.headers.get("x-snapshot-secret");
  if (!secret || provided !== secret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const { data: businesses, error: bErr } = await svc.from("businesses").select("id");
    if (bErr) throw bErr;

    let recomputed = 0;
    for (const b of businesses ?? []) {
      const { error } = await svc.rpc("compute_business_health_score", { p_business_id: b.id });
      if (!error) recomputed++;
    }
    const { data: snapped, error: sErr } = await svc.rpc("snapshot_all_health_scores");
    if (sErr) throw sErr;

    await logRun(svc, "success", {
      rows_affected: snapped ?? 0,
      duration_ms: Date.now() - start,
      metadata: { recomputed, businesses_seen: businesses?.length ?? 0 },
    });
    return new Response(JSON.stringify({ ok: true, recomputed, snapshotted: snapped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    const dur = Date.now() - start;
    const startedAt = new Date(start).toISOString();
    await logRun(svc, "failure", { duration_ms: dur, error_text: msg });
    await alertFailure(svc, msg, startedAt, dur);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
