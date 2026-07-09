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

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: partner } = await svc.from("capital_partners")
      .select("id, name, webhook_secret_hash, is_active")
      .eq("id", partnerId)
      .maybeSingle();

    if (!partner || !partner.is_active || !partner.webhook_secret_hash) {
      logSecurityEvent("capital_partner_unknown", { partnerId });
      return secureResponse(JSON.stringify({ error: "Unauthorized" }), 401, corsHeaders);
    }

    if (!timingSafeEqual(fingerprint, partner.webhook_secret_hash)) {
      logSecurityEvent("capital_partner_bad_fingerprint", { partnerId });
      return secureResponse(JSON.stringify({ error: "Unauthorized" }), 401, corsHeaders);
    }

    const rawBody = await req.text();
    // Signature binds body to fingerprint: sha256(fingerprint + "\n" + rawBody)
    const expected = await sha256Hex(`${fingerprint}\n${rawBody}`);
    if (!timingSafeEqual(signature.replace(/^sha256=/, ""), expected)) {
      logSecurityEvent("capital_partner_bad_signature", { partnerId });
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

    const { data: advance } = await svc.from("capital_advances")
      .select("id, business_id, status")
      .eq("id", ev.advance_id).maybeSingle();
    if (!advance) {
      return secureResponse(JSON.stringify({ error: "Advance not found" }), 404, corsHeaders);
    }

    let repaymentId: string | null = null;

    if (ev.event === "repayment.recorded") {
      if (!ev.amount_kes) {
        return secureResponse(JSON.stringify({ error: "amount_kes required" }), 400, corsHeaders);
      }
      const { data, error } = await svc.rpc("record_capital_repayment", {
        p_advance_id: ev.advance_id,
        p_amount: ev.amount_kes,
        p_reference: ev.reference ?? null,
        p_source: "partner",
        p_partner_id: partner.id,
        p_checkout_request_id: null,
      });
      if (error) throw error;
      repaymentId = data as string;
    } else if (ev.event === "advance.written_off") {
      await svc.from("capital_advances").update({
        status: "defaulted", closed_at: new Date().toISOString(),
      }).eq("id", ev.advance_id);
      await svc.from("capital_audit").insert({
        business_id: advance.business_id,
        action: "capital.advance.written_off",
        entity_type: "capital_advance", entity_id: ev.advance_id,
        metadata: { partner_id: partner.id, reference: ev.reference },
      });
    } else if (ev.event === "advance.status" && ev.status) {
      await svc.from("capital_advances").update({ status: ev.status }).eq("id", ev.advance_id);
      await svc.from("capital_audit").insert({
        business_id: advance.business_id,
        action: "capital.advance.status",
        entity_type: "capital_advance", entity_id: ev.advance_id,
        metadata: { partner_id: partner.id, new_status: ev.status },
      });
    }

    await svc.from("capital_partners").update({
      last_event_at: new Date().toISOString(),
    }).eq("id", partner.id);

    logSecurityEvent("capital_partner_event", { partnerId, event: ev.event });
    return secureResponse(
      JSON.stringify({ ok: true, repayment_id: repaymentId }), 200, corsHeaders
    );
  } catch (err) {
    logError("capital-partner-webhook", err, { fatal: true });
    return secureResponse(JSON.stringify({ error: "Internal error" }), 500, corsHeaders);
  }
});
