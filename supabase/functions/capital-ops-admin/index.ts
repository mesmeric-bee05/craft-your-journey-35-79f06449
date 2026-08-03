/**
 * Capital Ops Admin — retry actions for the production Capital pipeline.
 *
 * Admin-only. Rate limited. Audited. Supports:
 *   POST { action: "retry_disbursement", advance_id }
 *   POST { action: "reprocess_webhook",  event_id }
 *   POST { action: "trigger_repayment_cron" }
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { rateLimit } from "../_shared/rate-limiter.ts";
import { logError, logSecurityEvent } from "../_shared/errors.ts";
import { parseJsonBody } from "../_shared/validators.ts";
import { notifyOpsFailure } from "../_shared/cron-alerts.ts";
import { handleCapitalEvent, type CapitalEventBody } from "../_shared/capital-webhook-handler.ts";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("retry_disbursement"), advance_id: z.string().uuid() }),
  z.object({ action: z.literal("reprocess_webhook"), event_id: z.string().uuid() }),
  z.object({ action: z.literal("replay_webhook"), event_id: z.string().uuid() }),
  z.object({ action: z.literal("trigger_repayment_cron") }),
]);


Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders("*");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return secureResponse(JSON.stringify({ error: "Admin only" }), 403, corsHeaders);
    }

    const rl = rateLimit(req, admin.userId, {
      userLimit: { windowMs: 3600_000, maxRequests: 20 },
      keyPrefix: "capital-ops-admin",
    }, corsHeaders);
    if (!rl.allowed) return rl.response!;

    const { data: raw, error: pe } = await parseJsonBody(req, corsHeaders);
    if (pe) return pe;
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return secureResponse(
        JSON.stringify({ error: "Invalid body", details: parsed.error.flatten() }),
        400, corsHeaders
      );
    }

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (parsed.data.action === "retry_disbursement") {
      const { advance_id } = parsed.data;
      // Reset failed advance so mpesa-b2c-disburse will accept it
      const { data: adv } = await svc.from("capital_advances")
        .select("id, disbursement_status").eq("id", advance_id).single();
      if (!adv) return secureResponse(JSON.stringify({ error: "Advance not found" }), 404, corsHeaders);
      if (adv.disbursement_status === "disbursed") {
        return secureResponse(JSON.stringify({ error: "Already disbursed" }), 409, corsHeaders);
      }
      await svc.from("capital_advances").update({
        disbursement_status: "pending", disbursement_error: null,
      }).eq("id", advance_id);

      const r = await fetch(`${supabaseUrl}/functions/v1/mpesa-b2c-disburse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization") ?? `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ advance_id, force: true }),
      });
      const result = await r.json();

      await svc.from("capital_audit").insert({
        actor_user_id: admin.userId,
        action: "capital.disburse.retry",
        entity_type: "capital_advance", entity_id: advance_id,
        metadata: { result },
      });
      logSecurityEvent("capital_disburse_retry", { userId: admin.userId, advance_id, ok: r.ok });
      return secureResponse(JSON.stringify({ ok: r.ok, result }), r.ok ? 200 : 502, corsHeaders);
    }

    if (parsed.data.action === "reprocess_webhook" || parsed.data.action === "replay_webhook") {
      const isReplay = parsed.data.action === "replay_webhook";
      const { event_id } = parsed.data;

      // Extra quota on replay: it bypasses the dedupe guard for a single event.
      if (isReplay) {
        const { data: quota } = await svc.rpc("check_and_record_admin_action", {
          p_action: "capital.webhook.replay",
          p_max_per_hour: 20,
        });
        if (quota && (quota as { allowed?: boolean }).allowed === false) {
          return secureResponse(JSON.stringify({
            error: "Replay quota exceeded — try again later", detail: quota,
          }), 429, corsHeaders);
        }
      }

      const { data: ev } = await svc.from("capital_webhook_events")
        .select("*").eq("id", event_id).single();
      if (!ev) return secureResponse(JSON.stringify({ error: "Event not found" }), 404, corsHeaders);

      const body = ev.body as CapitalEventBody;
      let outcome: { ok: boolean; code: string; detail?: unknown };

      try {
        const r = await handleCapitalEvent(svc, body, ev.partner_id ?? null);
        outcome = { ok: r.ok, code: r.code, detail: r.detail ?? null };
        await svc.from("capital_webhook_events").update({
          status: r.ok ? "processed" : "failed",
          error: r.ok ? null : r.code,
          processed_at: new Date().toISOString(),
        }).eq("id", event_id);
      } catch (err) {
        const message = (err as Error).message;
        await svc.from("capital_webhook_events").update({
          status: "failed", error: message, processed_at: new Date().toISOString(),
        }).eq("id", event_id);
        outcome = { ok: false, code: "exception", detail: message };
      }

      await svc.from("capital_audit").insert({
        actor_user_id: admin.userId,
        action: isReplay ? "capital.webhook.replay" : "capital.webhook.reprocess",
        entity_type: "capital_webhook_event", entity_id: event_id,
        metadata: {
          outcome,
          event_type: body.event ?? null,
          advance_id: body.advance_id ?? null,
          ip: req.headers.get("x-forwarded-for") ?? null,
          user_agent: req.headers.get("user-agent") ?? null,
        },
      });

      if (!outcome.ok) {
        await notifyOpsFailure(svc, {
          source: "capital-ops-admin",
          code: outcome.code,
          title: isReplay ? "Capital webhook replay failed" : "Capital webhook reprocess failed",
          detail: String(outcome.detail ?? outcome.code),
          context: { event_id, actor: admin.userId, event: body.event ?? "unknown" },
        });
      }

      logSecurityEvent(isReplay ? "capital_webhook_replay" : "capital_webhook_reprocess", {
        userId: admin.userId, event_id, ok: outcome.ok,
      });
      return secureResponse(JSON.stringify(outcome), outcome.ok ? 200 : 400, corsHeaders);
    }


    if (parsed.data.action === "trigger_repayment_cron") {
      const cronSecret = Deno.env.get("CRON_SECRET");
      if (!cronSecret) {
        return secureResponse(JSON.stringify({ error: "CRON_SECRET not configured" }), 503, corsHeaders);
      }
      const r = await fetch(`${supabaseUrl}/functions/v1/capital-repayment-cron`, {
        method: "POST",
        headers: { "x-cron-secret": cronSecret, "Content-Type": "application/json" },
        body: "{}",
      });
      const result = await r.json();
      await svc.from("capital_audit").insert({
        actor_user_id: admin.userId,
        action: "capital.repayment_cron.manual",
        entity_type: "cron_job", entity_id: null,
        metadata: { processed: result.processed ?? 0 },
      });
      logSecurityEvent("capital_repayment_cron_manual", { userId: admin.userId });
      return secureResponse(JSON.stringify({ ok: true, result }), r.ok ? 200 : 502, corsHeaders);
    }

    return secureResponse(JSON.stringify({ error: "Unknown action" }), 400, corsHeaders);
  } catch (err) {
    logError("capital-ops-admin", err, { fatal: true });
    return secureResponse(JSON.stringify({ error: "Internal error" }), 500, corsHeaders);
  }
});
