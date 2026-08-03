/**
 * M-Pesa B2C Disburse — SmartReach Capital
 *
 * Sends approved capital advance principal to the business owner's phone via
 * the Safaricom Daraja B2C API.
 *
 * SECURITY:
 * - Admin-only (requireAdmin)
 * - Rate limited (10/hour per admin)
 * - Zod-validated body
 * - Full audit trail in capital_audit
 * - Graceful 503 when Daraja secrets missing
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { rateLimit } from "../_shared/rate-limiter.ts";
import { logError, logSecurityEvent } from "../_shared/errors.ts";
import { parseJsonBody } from "../_shared/validators.ts";

const Body = z.object({
  advance_id: z.string().uuid(),
  /** Admin retry action only: allow re-requesting a payout stuck in `processing`. */
  force: z.boolean().optional(),
}).strict();


function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+254")) return cleaned.substring(1);
  if (cleaned.startsWith("254")) return cleaned;
  if (cleaned.startsWith("0")) return "254" + cleaned.substring(1);
  return "254" + cleaned;
}

async function getAccessToken(key: string, secret: string, sandbox: boolean) {
  const base = sandbox ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke";
  const r = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` },
  });
  if (!r.ok) throw new Error("Daraja OAuth failed");
  return (await r.json()).access_token as string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders("*");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return secureResponse(JSON.stringify({ error: "Admin only" }), 403, corsHeaders);
    }

    const rate = rateLimit(req, admin.userId, {
      userLimit: { windowMs: 3600_000, maxRequests: 10 },
      keyPrefix: "capital-b2c",
    }, corsHeaders);
    if (!rate.allowed) return rate.response!;

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

    const { data: advance, error: aErr } = await svc
      .from("capital_advances")
      .select("id, business_id, principal_kes, disbursement_status, businesses(owner_id, name)")
      .eq("id", parsed.data.advance_id)
      .single();

    if (aErr || !advance) {
      return secureResponse(JSON.stringify({ error: "Advance not found" }), 404, corsHeaders);
    }
    if (advance.disbursement_status === "disbursed") {
      return secureResponse(JSON.stringify({ error: "Already disbursed" }), 409, corsHeaders);
    }
    // Idempotency guard: never double-request a payout already in flight unless
    // an admin explicitly forces a retry from the ops dashboard.
    if (advance.disbursement_status === "processing" && !parsed.data.force) {
      return secureResponse(JSON.stringify({
        error: "Disbursement already in progress",
        code: "IN_PROGRESS",
      }), 409, corsHeaders);
    }


    // Owner phone from profile
    const ownerId = (advance.businesses as any)?.owner_id as string | undefined;
    if (!ownerId) {
      return secureResponse(JSON.stringify({ error: "Business owner missing" }), 400, corsHeaders);
    }
    const { data: profile } = await svc
      .from("profiles").select("phone, full_name").eq("user_id", ownerId).single();

    const rawPhone = (profile?.phone ?? "").toString().trim();
    if (!rawPhone) {
      return secureResponse(
        JSON.stringify({ error: "Owner phone missing on profile" }), 400, corsHeaders
      );
    }
    const msisdn = normalizePhone(rawPhone);

    // Secrets
    const key = Deno.env.get("MPESA_CONSUMER_KEY");
    const secret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const initiator = Deno.env.get("MPESA_B2C_INITIATOR_NAME");
    const credential = Deno.env.get("MPESA_B2C_SECURITY_CREDENTIAL");
    const shortcode = Deno.env.get("MPESA_B2C_SHORTCODE");
    const isSandbox = Deno.env.get("MPESA_ENV") !== "production";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    if (!key || !secret || !initiator || !credential || !shortcode) {
      return secureResponse(
        JSON.stringify({ error: { code: "SERVICE_UNAVAILABLE", message: "M-Pesa B2C not configured" } }),
        503, corsHeaders
      );
    }

    // Mark requested
    await svc.from("capital_advances").update({
      disbursement_status: "processing",
      disbursed_msisdn: msisdn,
      disbursement_requested_at: new Date().toISOString(),
    }).eq("id", advance.id);

    const token = await getAccessToken(key, secret, isSandbox);
    const base = isSandbox ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke";

    const resultUrl = `${supabaseUrl}/functions/v1/mpesa-b2c-callback`;
    const payload = {
      OriginatorConversationID: crypto.randomUUID(),
      InitiatorName: initiator,
      SecurityCredential: credential,
      CommandID: "BusinessPayment",
      Amount: Math.round(Number(advance.principal_kes)),
      PartyA: shortcode,
      PartyB: msisdn,
      Remarks: `SmartReach Capital advance ${advance.id.slice(0, 8)}`,
      QueueTimeOutURL: resultUrl,
      ResultURL: resultUrl,
      Occassion: "capital_advance",
    };

    const resp = await fetch(`${base}/mpesa/b2c/v3/paymentrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await resp.json();

    const ok = result.ResponseCode === "0";

    // Create matching transaction row + stamp advance
    await svc.from("transactions").insert({
      business_id: advance.business_id,
      user_id: ownerId,
      type: "payout",
      amount: Number(advance.principal_kes),
      currency: "KES",
      status: ok ? "pending" : "failed",
      payment_method: "mpesa",
      reference: `capital-${advance.id.slice(0, 8)}`,
      description: "SmartReach Capital disbursement",
      recipient_phone: msisdn,
      external_reference: result.ConversationID ?? null,
      metadata: { reason: "capital_disburse", advance_id: advance.id, b2c: result },
    });

    if (!ok) {
      const reason = result.errorMessage ?? result.ResponseDescription ?? "B2C failed";
      await svc.from("capital_advances").update({
        disbursement_status: "failed",
        disbursement_error: reason,
      }).eq("id", advance.id);
      await notifyOpsFailure(svc, {
        source: "mpesa-b2c-disburse",
        code: String(result.ResponseCode ?? "b2c_failed"),
        title: "Capital disbursement failed",
        detail: String(reason),
        context: { advance_id: advance.id, business_id: advance.business_id },
      });
    } else {

      await svc.from("capital_advances").update({
        mpesa_disbursement_ref: result.ConversationID,
      }).eq("id", advance.id);
    }

    await svc.from("capital_audit").insert({
      actor_user_id: admin.userId,
      business_id: advance.business_id,
      action: ok ? "capital.disburse.request" : "capital.disburse.failed",
      entity_type: "capital_advance",
      entity_id: advance.id,
      metadata: { conversation_id: result.ConversationID, response: result },
    });

    logSecurityEvent("capital_b2c_initiated", {
      advanceId: advance.id, ok, code: result.ResponseCode,
    });

    return secureResponse(JSON.stringify({
      ok, conversation_id: result.ConversationID ?? null, response: result,
    }), ok ? 200 : 400, corsHeaders);
  } catch (err) {
    logError("mpesa-b2c-disburse", err, { fatal: true });
    return secureResponse(
      JSON.stringify({ error: "Internal error" }), 500, corsHeaders
    );
  }
});
