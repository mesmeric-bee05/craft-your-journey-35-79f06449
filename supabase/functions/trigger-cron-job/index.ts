/**
 * Admin-only proxy that lets an authenticated admin user run a known
 * scheduled job on demand from the dashboard.
 *
 * Hardening:
 *  - Strict admin check via has_role.
 *  - Rate limited via check_and_record_admin_action (5/hour/admin/action).
 *  - Audit-logged via log_user_action on every attempt (success + failure).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const JOBS: Record<string, { fn: string; secretEnv?: string; secretHeader?: string }> = {
  "snapshot-health-scores": { fn: "snapshot-health-scores", secretEnv: "SNAPSHOT_HEALTH_SECRET", secretHeader: "x-snapshot-secret" },
  "security-rescan-runner": { fn: "security-rescan-runner", secretEnv: "SECURITY_RESCAN_SECRET", secretHeader: "x-rescan-secret" },
};

const Body = z.object({ job: z.enum(["snapshot-health-scores", "security-rescan-runner"]) });

const MAX_PER_HOUR = 5;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function audit(svc: any, userId: string | null, success: boolean, meta: Record<string, unknown>) {
  try {
    await svc.from("audit_logs").insert({
      user_id: userId,
      action: success ? "admin.trigger_cron_job.success" : "admin.trigger_cron_job.denied",
      entity_type: "cron_job",
      metadata: meta,
    });
  } catch (_) { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null;
  const ua = req.headers.get("user-agent") ?? null;

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) {
    await audit(svc, null, false, { reason: "no_jwt", ip, ua });
    return json(401, { error: "unauthorized" });
  }

  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) {
    await audit(svc, null, false, { reason: "invalid_jwt", ip, ua });
    return json(401, { error: "unauthorized" });
  }
  const userId = u.user.id;

  const { data: isAdmin } = await svc.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) {
    await audit(svc, userId, false, { reason: "not_admin", ip, ua });
    return json(403, { error: "forbidden" });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    await audit(svc, userId, false, { reason: "invalid_body", ip, ua });
    return json(400, { error: "invalid body" });
  }
  const jobKey = parsed.data.job;

  // Rate limit (per-user, per-job) via SECURITY DEFINER RPC.
  // Use the user client so auth.uid() resolves inside the function.
  const { error: rlErr } = await userClient.rpc("check_and_record_admin_action" as never, {
    p_action: `trigger_cron_job:${jobKey}`,
    p_max_per_hour: MAX_PER_HOUR,
  });
  if (rlErr) {
    const isRateLimit = (rlErr as any)?.message?.includes("rate_limit_exceeded");
    let retryAfter = 3600;
    try {
      const detail = (rlErr as any)?.details ?? (rlErr as any)?.detail;
      if (detail) {
        const parsedDetail = JSON.parse(detail);
        retryAfter = parsedDetail.retry_after_seconds ?? retryAfter;
      }
    } catch (_) { /* ignore */ }
    await audit(svc, userId, false, {
      reason: isRateLimit ? "rate_limited" : "rate_limit_error",
      job: jobKey, ip, ua, error: (rlErr as any)?.message,
    });
    if (isRateLimit) {
      return new Response(
        JSON.stringify({ error: "rate_limit_exceeded", retryAfterSeconds: retryAfter, maxPerHour: MAX_PER_HOUR }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(retryAfter) } },
      );
    }
    return json(500, { error: "rate_limit_check_failed" });
  }

  const job = JOBS[jobKey];
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (job.secretEnv && job.secretHeader) {
    const s = Deno.env.get(job.secretEnv);
    if (s) headers[job.secretHeader] = s;
  }
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  headers["apikey"] = anon;
  headers["Authorization"] = `Bearer ${anon}`;

  const res = await fetch(`${url}/functions/v1/${job.fn}`, {
    method: "POST", headers, body: JSON.stringify({ trigger: "manual", actor: userId }),
  });
  const text = await res.text();
  await audit(svc, userId, res.ok, {
    job: jobKey, ip, ua, status: res.status, body: text.slice(0, 500),
  });
  return json(res.ok ? 200 : 502, { ok: res.ok, status: res.status, body: text.slice(0, 2000) });
});
