/**
 * Wallet Deposit via M-Pesa STK Push
 *
 * Creates a pending deposit transaction attached to the caller's wallet and
 * triggers a real Daraja STK push to the payer's phone. The mpesa-callback
 * function later completes the transaction (verified by the shared callback
 * token + amount check) and credits the wallet via the wallet_credit RPC.
 *
 * SECURITY:
 * - JWT authentication required
 * - Business membership verified
 * - Rate limited (sensitive limits)
 * - Input validated with Zod
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { verifyAuth, createServiceClient, verifyBusinessMembership } from "../_shared/auth.ts";
import { rateLimit, DEFAULT_LIMITS } from "../_shared/rate-limiter.ts";
import { logError, logSecurityEvent, internalError, badRequest } from "../_shared/errors.ts";
import { parseJsonBody, validateInput } from "../_shared/validators.ts";
import { getMpesaConfig, normalizeKenyanPhone, stkPush } from "../_shared/mpesa-stk.ts";

const DepositSchema = z.object({
  amount: z.number().min(1).max(150000),
  phone: z.string().min(9).max(15).regex(/^(?:\+254|254|0)?[17]\d{8}$/, "Invalid Kenyan phone number"),
  description: z.string().max(100).optional(),
}).strict();

function newReference(): string {
  // Short alphanumeric reference for the STK AccountReference (max 12 chars).
  return `SR${Date.now().toString(36).toUpperCase().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders("*");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ipRateCheck = rateLimit(req, null, {
      ...DEFAULT_LIMITS.sensitive,
      keyPrefix: "wallet-deposit",
    }, corsHeaders);
    if (!ipRateCheck.allowed) return ipRateCheck.response!;

    const { user, supabase, error: authError } = await verifyAuth(req, corsHeaders);
    if (authError) return authError;

    const userRateCheck = rateLimit(req, user!.id, {
      ...DEFAULT_LIMITS.sensitive,
      keyPrefix: "wallet-deposit",
    }, corsHeaders);
    if (!userRateCheck.allowed) return userRateCheck.response!;

    const { data: rawBody, error: parseError } = await parseJsonBody(req, corsHeaders);
    if (parseError) return parseError;
    const validation = validateInput(DepositSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.error!;

    const { amount, phone, description } = validation.data!;

    // Resolve the caller's active business (same pattern as process-payment).
    const { data: membership } = await supabase!
      .from("business_members")
      .select("business_id")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    let businessId = membership?.business_id as string | undefined;

    if (!businessId) {
      const { data: owned } = await supabase!
        .from("businesses")
        .select("id")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      businessId = owned?.id as string | undefined;
    }

    if (!businessId) {
      return badRequest("No active business found", corsHeaders);
    }

    const isMember = await verifyBusinessMembership(supabase!, user!.id, businessId);
    if (!isMember) {
      logSecurityEvent("unauthorized_business_access", { userId: user!.id, businessId });
      return secureResponse(
        JSON.stringify({ error: { code: "FORBIDDEN", message: "Access denied" } }),
        403, corsHeaders
      );
    }

    const cfg = getMpesaConfig();
    if (!cfg) {
      return secureResponse(
        JSON.stringify({ error: { code: "SERVICE_UNAVAILABLE", message: "M-Pesa not configured" } }),
        503, corsHeaders
      );
    }

    const adminClient = createServiceClient();

    // Get or create the caller's wallet for this business.
    let walletId: string;
    const { data: wallet } = await adminClient
      .from("wallets")
      .select("id")
      .eq("business_id", businessId)
      .eq("user_id", user!.id)
      .maybeSingle();

    if (wallet?.id) {
      walletId = wallet.id;
    } else {
      const { data: created, error: walletErr } = await adminClient
        .from("wallets")
        .insert({ business_id: businessId, user_id: user!.id, balance: 0, currency: "KES" })
        .select("id")
        .single();
      if (walletErr || !created) {
        logError("wallet-deposit", walletErr, { step: "create_wallet" });
        return internalError(corsHeaders, "Failed to prepare wallet");
      }
      walletId = created.id;
    }

    const reference = newReference();
    const normalizedPhone = normalizeKenyanPhone(phone);

    // SECURITY: bind the STK recipient to the caller's registered profile phone
    // so a signed-in user can never prompt payments to a third party's phone.
    const { data: profile } = await supabase!
      .from("profiles")
      .select("phone")
      .eq("id", user!.id)
      .maybeSingle();
    const registeredPhone = profile?.phone ? normalizeKenyanPhone(profile.phone as string) : null;
    if (!registeredPhone) {
      return badRequest(
        "Add a phone number to your profile before requesting an M-Pesa deposit",
        corsHeaders
      );
    }
    if (normalizedPhone !== registeredPhone) {
      logSecurityEvent("wallet_deposit_phone_mismatch", { userId: user!.id, businessId });
      return secureResponse(
        JSON.stringify({ error: { code: "PHONE_MISMATCH", message: "Deposits can only be sent to your registered phone number" } }),
        403, corsHeaders
      );
    }


    const { data: transaction, error: txError } = await adminClient
      .from("transactions")
      .insert({
        business_id: businessId,
        wallet_id: walletId,
        user_id: user!.id,
        type: "deposit",
        amount,
        currency: "KES",
        status: "pending",
        payment_method: "mpesa",
        reference,
        description: description || "Wallet deposit via M-Pesa",
        recipient_phone: `+${normalizedPhone}`,
        metadata: { initiated_at: new Date().toISOString(), channel: "stk_push", sandbox: cfg.isSandbox },
      })
      .select()
      .single();

    if (txError || !transaction) {
      logError("wallet-deposit", txError, { step: "create_transaction" });
      return internalError(corsHeaders, "Failed to create transaction record");
    }

    logSecurityEvent("wallet_deposit_stk_initiated", {
      transactionId: transaction.id, userId: user!.id, businessId, amount, sandbox: cfg.isSandbox,
    });

    const stk = await stkPush(cfg, {
      phone: normalizedPhone,
      amount,
      reference,
      description: description || "Wallet deposit",
    });

    if (stk.ok && stk.checkoutRequestId) {
      await adminClient.from("transactions").update({
        external_reference: stk.checkoutRequestId,
        metadata: {
          ...(transaction.metadata as Record<string, unknown>),
          merchant_request_id: stk.merchantRequestId,
          checkout_request_id: stk.checkoutRequestId,
        },
      }).eq("id", transaction.id);

      return secureResponse(JSON.stringify({
        success: true,
        message: "STK push sent. Check your phone for the M-Pesa prompt.",
        transactionId: transaction.id,
        checkoutRequestId: stk.checkoutRequestId,
      }), 200, corsHeaders);
    }

    await adminClient.from("transactions").update({
      status: "failed",
      metadata: {
        ...(transaction.metadata as Record<string, unknown>),
        error: stk.error,
      },
    }).eq("id", transaction.id);

    logError("wallet-deposit", new Error(stk.error ?? "STK push failed"), { transactionId: transaction.id });

    return secureResponse(JSON.stringify({
      success: false,
      error: stk.error ?? "STK push failed",
      transactionId: transaction.id,
    }), 400, corsHeaders);
  } catch (error) {
    logError("wallet-deposit", error, { fatal: true });
    return internalError(corsHeaders);
  }
});
