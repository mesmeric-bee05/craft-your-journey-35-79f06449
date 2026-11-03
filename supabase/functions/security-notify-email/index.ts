/**
 * Emails admins a digest of pending security alerts.
 *
 * Sources rows from public.security_admin_notifications that have not been
 * emailed yet (emailed_at IS NULL) and sends one digest per admin, then stamps
 * emailed_at so a scan or status change is never emailed twice.
 *
 * Auth (fail-closed):
 *  - `x-rescan-secret` matching SECURITY_RESCAN_SECRET, or
 *  - `x-job-secret` matching public.cron_job_secrets for this job, or
 *  - an admin JWT (has_role check).
 *
 * Email delivery uses Resend when RESEND_API_KEY is configured; without it the
 * function reports `email_not_configured` instead of failing, so in-app alerts
 * keep working.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const JOB = "security-notify-email";

type Notification = {
  id: string;
  user_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  created_at: string;
};

// deno-lint-ignore no-explicit-any
async function authorize(req: Request, svc: any): Promise<boolean> {
  const wantSecret = Deno.env.get("SECURITY_RESCAN_SECRET");
  if (wantSecret && req.headers.get("x-rescan-secret") === wantSecret) return true;

  const jobSecret = req.headers.get("x-job-secret");
  if (jobSecret) {
    const { data: row } = await svc
      .from("cron_job_secrets").select("secret").eq("job_name", JOB).maybeSingle();
    if (row?.secret && row.secret === jobSecret) return true;
  }

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) return false;
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return false;
  const { data: ok } = await svc.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  return Boolean(ok);
}

function appBaseUrl(): string {
  return Deno.env.get("APP_BASE_URL") ?? "https://craft-your-journey-35.lovable.app";
}

// SECURITY: notification titles/bodies come from admin-editable finding data.
// Escape every interpolated value so a crafted finding name cannot inject
// deceptive markup or links into digest emails sent to other admins.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function digestHtml(rows: Notification[]): string {
  const base = appBaseUrl();
  const items = rows
    .map(
      (r) =>
        `<li style="margin-bottom:10px"><strong>${escapeHtml(r.title)}</strong><br/>` +
        `<span style="color:#555">${escapeHtml(r.body ?? "")}</span><br/>` +
        `<span style="color:#888;font-size:12px">${escapeHtml(new Date(r.created_at).toUTCString())}</span></li>`,
    )
    .join("");
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5">
      <h2 style="margin:0 0 12px">SmartReach security update</h2>
      <p style="color:#444">${rows.length} security event${rows.length === 1 ? "" : "s"} need your attention.</p>
      <ul style="padding-left:18px">${items}</ul>
      <p>
        <a href="${base}/admin/monitoring/security" style="color:#1a56db">Open Security audit</a> ·
        <a href="${base}/security/findings" style="color:#1a56db">Open findings audit trail</a> ·
        <a href="${base}/admin/monitoring/health" style="color:#1a56db">System health</a>
      </p>
    </div>`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return { ok: false, error: "email_not_configured" };
  const from = Deno.env.get("SECURITY_ALERT_FROM") ?? "SmartReach Security <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) return { ok: false, error: `resend_${res.status}: ${await res.text().catch(() => "")}` };
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (!(await authorize(req, svc))) return json({ error: "unauthorized" }, 401);

  try {
    // Manual test: an admin sends a sample digest to their own inbox.
    const body = req.method === "POST" ? await req.clone().json().catch(() => ({})) : {};
    if (body?.test === true) {
      const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer /, "");
      const { data: u } = await svc.auth.getUser(jwt);
      const to = u?.user?.email;
      if (!to) return json({ error: "admin_sign_in_required" }, 401);
      const { data: isAdmin } = await svc.rpc("has_role", { _user_id: u.user!.id, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
      const out = await sendEmail(to, "SmartReach security digest — test", digestHtml([{
        id: "test", user_id: u.user!.id, kind: "test", title: "Test digest",
        body: "This is a test of your SmartReach security digest. No action needed.",
        created_at: new Date().toISOString(),
      } as Notification]));
      await svc.from("audit_logs").insert({ user_id: u.user!.id, action: "security_digest_test", resource_type: "security", details: { ok: out.ok } }).then(() => {}, () => {});
      return json(out.ok ? { ok: true, sent: 1, to } : { ok: false, error: out.error }, out.ok ? 200 : 502);
    }

    const { data: pending, error } = await svc
      .from("security_admin_notifications")
      .select("id, user_id, kind, title, body, created_at")
      .is("emailed_at", null)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw error;

    const rows = (pending ?? []) as Notification[];
    if (rows.length === 0) return json({ ok: true, sent: 0, pending: 0 });

    // Group by recipient (rows are inserted per admin user).
    const byUser = new Map<string, Notification[]>();
    for (const r of rows) {
      if (!r.user_id) continue;
      const list = byUser.get(r.user_id) ?? [];
      list.push(r);
      byUser.set(r.user_id, list);
    }

    let sent = 0;
    let emailConfigured = true;
    const failures: string[] = [];
    const delivered: string[] = [];

    for (const [userId, list] of byUser) {
      const { data: u } = await svc.auth.admin.getUserById(userId);
      const to = u?.user?.email;
      if (!to) {
        failures.push(`${userId}:no_email`);
        continue;
      }
      const subject =
        list.length === 1 ? list[0].title : `${list.length} SmartReach security updates`;
      const out = await sendEmail(to, subject, digestHtml(list));
      if (out.ok) {
        sent++;
        delivered.push(...list.map((n) => n.id));
      } else {
        if (out.error === "email_not_configured") emailConfigured = false;
        failures.push(`${userId}:${out.error}`);
      }
    }

    if (delivered.length > 0) {
      await svc
        .from("security_admin_notifications")
        .update({ emailed_at: new Date().toISOString() })
        .in("id", delivered);
    }

    return json({
      ok: true,
      sent,
      pending: rows.length,
      email_configured: emailConfigured,
      failures: failures.slice(0, 10),
    });
  } catch (e) {
    console.error("[security-notify-email] error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
