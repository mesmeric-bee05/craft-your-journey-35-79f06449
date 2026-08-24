/**
 * M-Pesa B2C Result Callback — Capital disbursement
 *
 * Public endpoint (Daraja calls it). Updates transaction + advance state
 * and appends a capital_audit entry.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { rateLimit } from "../_shared/rate-limiter.ts";
import { logError, logSecurityEvent } from "../_shared/errors.ts";
import { parseJsonBody } from "../_shared/validators.ts";
import { verifyCallbackSource } from "../_shared/callback-auth.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders("*");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rl = rateLimit(req, null, {
      ipLimit: { windowMs: 60_000, maxRequests: 30 },
      keyPrefix: "capital-b2c-cb",
    }, corsHeaders);
    if (!rl.allowed) return rl.response!;

    const srcCheck = verifyCallbackSource(req);
    if (!srcCheck.ok) {
      logSecurityEvent("capital_b2c_callback_source_rejected", { reason: srcCheck.reason });
      return secureResponse(JSON.stringify({ ResultCode: 1, ResultDesc: "Unauthorized" }), 401, corsHeaders);
    }

    const { data: body, error: pe } = await parseJsonBody(req, corsHeaders);
    if (pe) return pe;

    const result = (body as any)?.Result;
    if (!result) {
      return secureResponse(JSON.stringify({ ResultCode: 1, ResultDesc: "Bad body" }), 400, corsHeaders);
    }

    const conversationId = result.ConversationID;
    const ok = result.ResultCode === 0;
    const receipt = result.ResultParameters?.ResultParameter?.find?.(
      (p: any) => p.Key === "TransactionReceipt"
    )?.Value ?? null;

    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Match by conversation id → advance
    const { data: advance } = await svc.from("capital_advances")
      .select("id, business_id")
      .eq("mpesa_disbursement_ref", conversationId)
      .maybeSingle();

    if (advance) {
      await svc.from("capital_advances").update({
        disbursement_status: ok ? "disbursed" : "failed",
        disbursement_error: ok ? null : (result.ResultDesc ?? "B2C failed"),
      }).eq("id", advance.id);

      await svc.from("capital_audit").insert({
        business_id: advance.business_id,
        action: ok ? "capital.disburse.confirmed" : "capital.disburse.failed",
        entity_type: "capital_advance",
        entity_id: advance.id,
        metadata: { result, receipt },
      });
    }

    await svc.from("transactions")
      .update({
        status: ok ? "completed" : "failed",
        completed_at: ok ? new Date().toISOString() : null,
      })
      .eq("external_reference", conversationId);

    logSecurityEvent("capital_b2c_callback", { conversationId, ok });

    return secureResponse(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), 200, corsHeaders
    );
  } catch (err) {
    logError("mpesa-b2c-callback", err, { fatal: true });
    return secureResponse(
      JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted with error" }), 200, corsHeaders
    );
  }
});
