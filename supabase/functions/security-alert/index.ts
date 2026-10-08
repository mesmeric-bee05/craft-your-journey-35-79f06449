/**
 * Security alert dispatcher.
 *
 * Called by CI (scripts/lib/uploadCheckRun.ts) whenever a security check
 * uploads a row with status === 'fail'. Sends an email to admins and/or
 * POSTs to a configured webhook (Slack/Discord/etc.) so we can react
 * immediately.
 *
 * Auth: shared-secret header `x-alert-secret` compared with
 *   Deno.env.get('SECURITY_ALERT_SHARED_SECRET'). No JWT — this is called
 *   from CI runners, not user sessions, so verify_jwt = false in config.toml.
 */
import { z } from "https://esm.sh/zod@3.23.8";
import { rateLimit } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-alert-secret",
};

const PayloadSchema = z.object({
  check_type: z.enum(["headers", "rpc_roles", "storage"]),
  status: z.enum(["pass", "fail", "warn"]),
  environment: z.string().min(1).max(64),
  summary: z.string().max(2000).optional().nullable(),
  commit_sha: z.string().max(64).optional().nullable(),
  run_url: z.string().url().max(512).optional().nullable(),
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const escHtml = (v: string) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Rate limit per IP (max 30/min) to stop alert flooding.
  const rl = rateLimit(req, null, {
    ipLimit: { windowMs: 60_000, maxRequests: 30 },
    keyPrefix: "security-alert",
  }, corsHeaders);
  if (!rl.allowed) return rl.response!;

  const expected = Deno.env.get("SECURITY_ALERT_SHARED_SECRET");
  if (!expected) {
    return new Response(JSON.stringify({ error: "alerting not configured" }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const provided = req.headers.get("x-alert-secret") ?? "";
  if (!timingSafeEqual(provided, expected)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parsed;
  try {
    const body = await req.json();
    parsed = PayloadSchema.safeParse(body);
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const p = parsed.data;

  // Only alert on fail/warn — pass is silent.
  if (p.status === "pass") {
    return new Response(JSON.stringify({ ok: true, skipped: "pass" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const checkLabel: Record<string, string> = {
    headers: "Security headers",
    rpc_roles: "SECURITY DEFINER RPC roles",
    storage: "Storage lockdown",
  };
  const title = `🚨 ${checkLabel[p.check_type]} — ${p.status.toUpperCase()} (${p.environment})`;
  const lines = [
    `Check: ${checkLabel[p.check_type]}`,
    `Status: ${p.status}`,
    `Environment: ${p.environment}`,
    p.commit_sha ? `Commit: ${p.commit_sha.slice(0, 12)}` : null,
    p.summary ? `Summary: ${p.summary}` : null,
    p.run_url ? `Run: ${p.run_url}` : null,
  ].filter(Boolean) as string[];
  const text = lines.join("\n");

  const results: Record<string, unknown> = {};

  // 1. Webhook (Slack/Discord-compatible JSON)
  const webhook = Deno.env.get("SECURITY_ALERT_WEBHOOK_URL");
  if (webhook) {
    try {
      const wRes = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `${title}\n${text}`, content: `${title}\n${text}` }),
      });
      results.webhook = { ok: wRes.ok, status: wRes.status };
    } catch (e) {
      results.webhook = { ok: false, error: String((e as Error).message) };
    }
  }

  // 2. Email (Resend, direct — does not depend on auth'd send-email function)
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const recipientsRaw = Deno.env.get("SECURITY_ALERT_EMAILS") ?? "";
  const recipients = recipientsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  if (resendKey && recipients.length > 0) {
    try {
      const eRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: Deno.env.get("SECURITY_ALERT_FROM") ?? "alerts@onresend.dev",
          to: recipients,
          subject: title,
          text,
          html: `<h2>${escHtml(title)}</h2><pre style="font-family:ui-monospace,monospace">${escHtml(text)}</pre>`,
        }),
      });
      results.email = { ok: eRes.ok, status: eRes.status };
    } catch (e) {
      results.email = { ok: false, error: String((e as Error).message) };
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
