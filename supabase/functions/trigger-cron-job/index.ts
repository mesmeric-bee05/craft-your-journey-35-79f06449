/**
 * Admin-only proxy that lets an authenticated admin user run a known
 * scheduled job on demand from the dashboard, without exposing the
 * job's shared secret to the browser.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";

const JOBS: Record<string, { fn: string; secretEnv?: string; secretHeader?: string }> = {
  "snapshot-health-scores": { fn: "snapshot-health-scores", secretEnv: "SNAPSHOT_HEALTH_SECRET", secretHeader: "x-snapshot-secret" },
  "security-rescan-runner": { fn: "security-rescan-runner", secretEnv: "SECURITY_RESCAN_SECRET", secretHeader: "x-rescan-secret" },
};

const Body = z.object({ job: z.enum(["snapshot-health-scores", "security-rescan-runner"]) });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: isAdmin } = await svc.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "invalid body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const job = JOBS[parsed.data.job];
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (job.secretEnv && job.secretHeader) {
    const s = Deno.env.get(job.secretEnv);
    if (s) headers[job.secretHeader] = s;
  }
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  headers["apikey"] = anon;
  headers["Authorization"] = `Bearer ${anon}`;

  const res = await fetch(`${url}/functions/v1/${job.fn}`, {
    method: "POST", headers, body: JSON.stringify({ trigger: "manual", actor: u.user.id }),
  });
  const text = await res.text();
  return new Response(JSON.stringify({ ok: res.ok, status: res.status, body: text.slice(0, 2000) }), {
    status: res.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
