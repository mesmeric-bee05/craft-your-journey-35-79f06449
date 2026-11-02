/**
 * Capital Partner Webhook — timestamped HMAC-signed inbound events.
 *
 * Protocol:
 *   X-Partner-Id: <uuid>
 *   X-Timestamp: <unix seconds>
 *   X-Signature: sha256=<hex HMAC-SHA256>
 *
 * The partner derives the HMAC key once from the plaintext secret returned by
 * rotate_capital_partner_secret: SHA-256(plaintext). The derived key is stored
 * server-side as webhook_secret_hash and is never sent in a request. The signed
 * message is `${timestamp}.${rawBody}` and timestamps expire after five minutes.
 */
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { rateLimit } from "../_shared/rate-limiter.ts";
import { logError, logSecurityEvent } from "../_shared/errors.ts";
import { notifyOpsFailure } from "../_shared/cron-alerts.ts";
import {
  computeDedupeKey,
  handleCapitalEvent,
  type CapitalEventBody,
} from "../_shared/capital-webhook-handler.ts";

const Event = z.object({
  event: z.enum(["repayment.recorded", "advance.written_off", "advance.status"]),
  advance_id: z.string().uuid(),
  amount_kes: z.number().positive().max(10_000_000).optional(),
  reference: z.string().max(120).optional(),
  status: z.enum(["active", "repaid", "defaulted"]).optional(),
  occurred_at: z.string().datetime().optional(),
});

async function hmacHex(keyText: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(keyText),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders("*");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return secureResponse(JSON.stringify({ error: "Method not allowed" }), 405, corsHeaders);
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const partnerId = req.headers.get("x-partner-id");
    const timestamp = req.headers.get("x-timestamp");
    const signature = req.headers.get("x-signature")?.replace(/^sha256=/i, "").toLowerCase();
    if (!partnerId || !timestamp || !signature) {
      return secureResponse(JSON.stringify({ error: "Missing auth headers" }), 401, corsHeaders);
    }

    const rl = rateLimit(req, partnerId, {
      userLimit: { windowMs: 60_000, maxRequests: 60 },
      keyPrefix: "capital-partner-webhook",
    }, corsHeaders);
    if (!rl.allowed) {
      logSecurityEvent("capital_partner_rate_limited", { partnerId });
      return rl.response!;
    }

    const { data: partner } = await svc.from("capital_partners")
      .select("id, name, webhook_secret_hash, is_active")
      .eq("id", partnerId)
      .maybeSingle();

    if (!partner || !partner.is_active || !partner.webhook_secret_hash) {
      logSecurityEvent("capital_partner_unknown", { partnerId });
      await notifyOpsFailure(svc, {
        source: "capital-partner-webhook",
        code: "partner_unknown_or_inactive",
        title: "Capital webhook rejected: unknown or inactive partner",
        detail: `Partner id ${partnerId} is unknown, inactive, or has no webhook secret.`,
        context: { partner_id: partnerId },
      });
      return secureResponse(JSON.stringify({ error: "Unauthorized" }), 401, corsHeaders);
    }

    const timestampSeconds = Number(timestamp);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!Number.isInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) {
      logSecurityEvent("capital_partner_stale_timestamp", { partnerId });
      return secureResponse(JSON.stringify({ error: "Stale webhook" }), 401, corsHeaders);
    }
    const rawBody = await req.text();
    const expected = await hmacHex(partner.webhook_secret_hash, `${timestamp}.${rawBody}`);
    if (!timingSafeEqual(signature, expected)) {
      logSecurityEvent("capital_partner_bad_signature", { partnerId });
      await notifyOpsFailure(svc, {
        source: "capital-partner-webhook",
        code: "signature_invalid",
        title: "Capital webhook rejected: invalid signature",
        detail: `Signature verification failed for partner ${partner.name}.`,
        context: { partner_id: partnerId },
      });
      return secureResponse(JSON.stringify({ error: "Bad signature" }), 401, corsHeaders);
    }

    let payload: unknown;
    try { payload = JSON.parse(rawBody); }
    catch { return secureResponse(JSON.stringify({ error: "Bad JSON" }), 400, corsHeaders); }

    const parsed = Event.safeParse(payload);
    if (!parsed.success) {
      return secureResponse(
        JSON.stringify({ error: "Invalid event", details: parsed.error.flatten() }),
        400, corsHeaders
      );
    }
    const ev = parsed.data;
    const dedupeKey = await computeDedupeKey(partner.id, ev as CapitalEventBody, rawBody);

    // Idempotency: a repeated delivery is logged once and never reprocessed.
    const { data: existing } = await svc.from("capital_webhook_events")
      .select("id, status")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    if (existing) {
      logSecurityEvent("capital_partner_duplicate", { partnerId, event: ev.event });
      return secureResponse(JSON.stringify({
        ok: true, duplicate: true, event_id: existing.id, status: existing.status,
      }), 200, corsHeaders);
    }

    // Persist inbound event for audit + retry
    const { data: evRow, error: insErr } = await svc.from("capital_webhook_events").insert({
      partner_id: partner.id,
      event: ev.event,
      advance_id: ev.advance_id,
      headers: { has_signature: true, signed_at: timestampSeconds },
      body: payload as Record<string, unknown>,
      sig_valid: true,
      status: "processing",
      dedupe_key: dedupeKey,
    }).select("id").single();

    // Unique-index violation === concurrent duplicate delivery.
    if (insErr) {
      if ((insErr as { code?: string }).code === "23505") {
        return secureResponse(JSON.stringify({ ok: true, duplicate: true }), 200, corsHeaders);
      }
      throw insErr;
    }
    const eventRowId = (evRow as { id: string } | null)?.id ?? null;

    try {
      const outcome = await handleCapitalEvent(svc, ev as CapitalEventBody, partner.id);

      if (eventRowId) {
        await svc.from("capital_webhook_events").update({
          status: outcome.ok ? "processed" : "failed",
          error: outcome.ok ? null : outcome.code,
          processed_at: new Date().toISOString(),
        }).eq("id", eventRowId);
      }

      if (!outcome.ok) {
        await notifyOpsFailure(svc, {
          source: "capital-partner-webhook",
          code: outcome.code,
          title: "Capital webhook processing failed",
          detail: `Event ${ev.event} for advance ${ev.advance_id} failed: ${outcome.code}`,
          context: { partner_id: partner.id, event_id: eventRowId, event: ev.event },
        });
        const status = outcome.code === "advance_not_found" ? 404
          : outcome.code === "advance_not_authorized" ? 403
          : 400;
        return secureResponse(
          JSON.stringify({ error: outcome.code, event_id: eventRowId }), status, corsHeaders
        );
      }

      await svc.from("capital_partners").update({
        last_event_at: new Date().toISOString(),
      }).eq("id", partner.id);

      logSecurityEvent("capital_partner_event", { partnerId, event: ev.event });
      return secureResponse(JSON.stringify({
        ok: true,
        repayment_id: (outcome.detail?.repayment_id as string | undefined) ?? null,
        event_id: eventRowId,
      }), 200, corsHeaders);
    } catch (innerErr) {
      const message = (innerErr as Error).message ?? "processing_error";
      if (eventRowId) await svc.from("capital_webhook_events").update({
        status: "failed",
        error: message,
        processed_at: new Date().toISOString(),
      }).eq("id", eventRowId);
      await notifyOpsFailure(svc, {
        source: "capital-partner-webhook",
        code: "processing_exception",
        title: "Capital webhook threw during processing",
        detail: message,
        context: { partner_id: partner.id, event_id: eventRowId, event: ev.event },
      });
      throw innerErr;
    }
  } catch (err) {
    logError("capital-partner-webhook", err, { fatal: true });
    return secureResponse(JSON.stringify({ error: "Internal error" }), 500, corsHeaders);
  }
});

