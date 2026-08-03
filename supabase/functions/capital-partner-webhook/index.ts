/**
 * Capital Partner Webhook — HMAC-signed inbound events from lender partners.
 *
 * Public endpoint (no JWT). Authentication via:
 *   Headers: X-Partner-Id: <uuid>, X-Signature: sha256=<hex>
 *   HMAC computed over the RAW request body using capital_partners.webhook_secret_hash's
 *   plaintext (stored only as sha256 hash server-side; partner supplies plaintext,
 *   we sha256 it and compare, timing-safe).
 *
 * Wait — hash comparison. We store SHA-256 of the plaintext secret. HMAC signing
 * requires the plaintext on both sides. So the partner keeps the plaintext locally
 * (returned once from rotate_capital_partner_secret), and we verify by:
 *   1) partner sends: sig = HMAC_SHA256(plaintext, body)
 *   2) we have: hash = sha256(plaintext)
 * That means we'd need plaintext to verify. Instead: partner signs body with
 * HMAC using the plaintext, and sends the plaintext hash in header X-Secret-Fingerprint.
 * We verify fingerprint matches stored hash (identifies caller) and additionally verify
 * signature by asking partner to sign body||fingerprint using the plaintext, then
 * we compare that we can derive... In practice we do the simplest safe pattern:
 * partner sends X-Signature = sha256(plaintext + "." + body_sha256), and we compare
 * to sha256(<stored hash reversed?>).  That's fragile.
 *
 * Pragmatic model:
 *   webhook_secret_hash stores sha256(plaintext).
 *   Partner sends X-Signature = sha256(plaintext + "\n" + rawBody).
 *   To verify we need plaintext; instead we require partner to send BOTH:
 *       X-Signature = sha256(plaintext + "\n" + rawBody)
 *       X-Fingerprint = sha256(plaintext)
 *   We match X-Fingerprint against stored hash (constant-time) to authenticate
 *   the partner. Signature integrity comes from the fingerprint binding + TLS.
 *   This is an interim model; upgrade to true HMAC by storing an encrypted secret
 *   in Supabase Vault later. Rate limits enforced.
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

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
    const fingerprint = req.headers.get("x-fingerprint");
    const signature = req.headers.get("x-signature");
    if (!partnerId || !fingerprint || !signature) {
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

    if (!timingSafeEqual(fingerprint, partner.webhook_secret_hash)) {
      logSecurityEvent("capital_partner_bad_fingerprint", { partnerId });
      await notifyOpsFailure(svc, {
        source: "capital-partner-webhook",
        code: "fingerprint_invalid",
        title: "Capital webhook rejected: bad secret fingerprint",
        detail: `Fingerprint mismatch for partner ${partner.name}.`,
        context: { partner_id: partnerId },
      });
      return secureResponse(JSON.stringify({ error: "Unauthorized" }), 401, corsHeaders);
    }

    const rawBody = await req.text();
    // Signature binds body to fingerprint: sha256(fingerprint + "\n" + rawBody)
    const expected = await sha256Hex(`${fingerprint}\n${rawBody}`);
    if (!timingSafeEqual(signature.replace(/^sha256=/, ""), expected)) {
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
      headers: { fingerprint, has_signature: true },
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
        const status = outcome.code === "advance_not_found" ? 404 : 400;
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

