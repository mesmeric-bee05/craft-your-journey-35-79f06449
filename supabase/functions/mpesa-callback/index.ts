/**
 * M-Pesa Callback Edge Function
 * 
 * Handles M-Pesa payment callbacks/webhooks
 * 
 * SECURITY:
 * - No JWT required (called by M-Pesa servers)
 * - IP-based rate limiting (30/min)
 * - Zod validation for callback body
 * - Structured logging via shared utilities
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { createServiceClient } from "../_shared/auth.ts";
import { rateLimit } from "../_shared/rate-limiter.ts";
import { logError, logSecurityEvent } from "../_shared/errors.ts";
import { parseJsonBody } from "../_shared/validators.ts";
import { verifyCallbackSource } from "../_shared/callback-auth.ts";

// Zod schema for M-Pesa callback body
const MPesaCallbackItemSchema = z.object({
  Name: z.string(),
  Value: z.union([z.string(), z.number()]),
});

const MPesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z.object({
        Item: z.array(MPesaCallbackItemSchema),
      }).optional(),
    }),
  }),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders('*');

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // IP-based rate limiting for callback abuse protection
    const rateLimitResult = rateLimit(req, null, {
      ipLimit: { windowMs: 60000, maxRequests: 30 },
      keyPrefix: 'mpesa-callback',
    }, corsHeaders);

    if (!rateLimitResult.allowed) {
      logSecurityEvent('rate_limit_exceeded', { endpoint: 'mpesa-callback', type: 'ip' });
      return rateLimitResult.response!;
    }

    // Verify the callback really originates from Safaricom (secret token in URL + optional IP allowlist)
    const srcCheck = verifyCallbackSource(req);
    if (!srcCheck.ok) {
      logSecurityEvent('mpesa_callback_source_rejected', { endpoint: 'mpesa-callback', reason: srcCheck.reason });
      return secureResponse(
        JSON.stringify({ ResultCode: 1, ResultDesc: 'Unauthorized' }),
        401, corsHeaders
      );
    }

    // Parse body with size limiting
    const { data: rawBody, error: parseError } = await parseJsonBody(req, corsHeaders);
    if (parseError) return parseError;

    // Validate callback structure
    const validation = MPesaCallbackSchema.safeParse(rawBody);
    if (!validation.success) {
      logSecurityEvent('invalid_callback_body', { errors: validation.error.errors.slice(0, 3) });
      return secureResponse(
        JSON.stringify({ ResultCode: 1, ResultDesc: 'Invalid callback structure' }),
        400, corsHeaders
      );
    }

    const supabase = createServiceClient();
    const { stkCallback } = validation.data.Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    logSecurityEvent('mpesa_callback_received', { CheckoutRequestID, ResultCode });

    // Find the transaction
    const { data: transaction, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('external_reference', CheckoutRequestID)
      .single();

    if (findError || !transaction) {
      logError('mpesa-callback', new Error('Transaction not found'), { CheckoutRequestID });
      return secureResponse(
        JSON.stringify({ ResultCode: 0, ResultDesc: 'Transaction not found but acknowledged' }),
        200, corsHeaders
      );
    }

    if (ResultCode === 0) {
      // Defense-in-depth: only complete transactions that are still pending,
      // and verify the callback amount matches the original STK push amount.
      if (transaction.status !== 'pending') {
        logSecurityEvent('mpesa_callback_ignored_non_pending', {
          transactionId: transaction.id, currentStatus: transaction.status,
        });
        return secureResponse(
          JSON.stringify({ ResultCode: 0, ResultDesc: 'Already processed' }),
          200, corsHeaders
        );
      }

      const amountItem = CallbackMetadata?.Item?.find((i) => i.Name === 'Amount');
      const callbackAmount = amountItem ? Number(amountItem.Value) : null;
      if (callbackAmount !== null && Number(transaction.amount) !== callbackAmount) {
        logSecurityEvent('mpesa_callback_amount_mismatch', {
          transactionId: transaction.id,
          expected: Number(transaction.amount),
          received: callbackAmount,
        });
        return secureResponse(
          JSON.stringify({ ResultCode: 1, ResultDesc: 'Amount mismatch' }),
          400, corsHeaders
        );
      }

      // Payment successful
      const metadata: Record<string, unknown> = {
        ...(transaction.metadata as Record<string, unknown> || {}),
        mpesa_result_code: ResultCode,
        mpesa_result_desc: ResultDesc,
        completed_at: new Date().toISOString(),
      };

      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          switch (item.Name) {
            case 'MpesaReceiptNumber': metadata.mpesa_receipt = item.Value; break;
            case 'TransactionDate': metadata.mpesa_transaction_date = item.Value; break;
            case 'PhoneNumber': metadata.mpesa_phone = item.Value; break;
            case 'Amount': metadata.mpesa_amount = item.Value; break;
          }
        }
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: 'completed', completed_at: new Date().toISOString(), metadata })
        .eq('id', transaction.id)
        .eq('status', 'pending');

      if (updateError) {
        logError('mpesa-callback', updateError, { step: 'update_completed', transactionId: transaction.id });
      } else {
        logSecurityEvent('mpesa_payment_completed', { transactionId: transaction.id, receipt: metadata.mpesa_receipt });

        // Update wallet balance
        if (transaction.wallet_id) {
          const { data: wallet } = await supabase
            .from('wallets').select('balance').eq('id', transaction.wallet_id).single();
          if (wallet) {
            const { error: creditError } = await supabase.rpc('wallet_credit', {
              p_wallet_id: transaction.wallet_id,
              p_amount: Number(transaction.amount),
            });
            if (creditError) {
              logError('mpesa-callback', creditError, { step: 'wallet_credit', transactionId: transaction.id });
            }
          }
        }

        // Capital repayment reconciliation: if the STK was seeded by the repayment cron,
        // record the repayment against the advance so the balance decreases.
        const meta = (transaction.metadata ?? {}) as Record<string, unknown>;
        if (meta.reason === "capital_repayment" && meta.advance_id) {
          const { error: repayErr } = await supabase.rpc("record_capital_repayment", {
            p_advance_id: meta.advance_id,
            p_amount: Number(transaction.amount),
            p_reference: (metadata.mpesa_receipt as string) ?? CheckoutRequestID,
            p_source: "auto_mpesa",
            p_partner_id: null,
            p_checkout_request_id: CheckoutRequestID,
          });
          if (repayErr) {
            logError("mpesa-callback", repayErr, { step: "capital_repayment", advanceId: meta.advance_id });
          }
          // Mark the seeded capital_repayments row as paid too (in case the row was inserted before the rpc)
          await supabase.from("capital_repayments").update({
            status: "paid",
            collected_at: new Date().toISOString(),
            mpesa_reference: (metadata.mpesa_receipt as string) ?? CheckoutRequestID,
          }).eq("checkout_request_id", CheckoutRequestID).eq("status", "pending");
        }

        // Create notification
        await supabase.from('notifications').insert({
          business_id: transaction.business_id,
          user_id: transaction.user_id,
          type: 'status_change',
          title: 'Payment Received',
          body: `KES ${Number(transaction.amount).toLocaleString()} payment received via M-Pesa`,
          data: {
            transaction_id: transaction.id,
            amount: transaction.amount,
            mpesa_receipt: metadata.mpesa_receipt,
          },
        });
      }
    } else {
      // Payment failed
      const errorMessages: Record<number, string> = {
        1: 'Insufficient balance',
        1032: 'Transaction cancelled by user',
        1037: 'Timeout - no response from user',
        2001: 'Wrong PIN entered',
      };

      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'failed',
          metadata: {
            ...(transaction.metadata as Record<string, unknown> || {}),
            mpesa_result_code: ResultCode,
            mpesa_result_desc: ResultDesc,
            error_reason: errorMessages[ResultCode] || ResultDesc,
            failed_at: new Date().toISOString(),
          },
        })
        .eq('id', transaction.id);

      if (updateError) {
        logError('mpesa-callback', updateError, { step: 'update_failed', transactionId: transaction.id });
      } else {
        logSecurityEvent('mpesa_payment_failed', { transactionId: transaction.id, resultCode: ResultCode, reason: errorMessages[ResultCode] || ResultDesc });
      }
    }

    return secureResponse(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Callback received successfully' }),
      200, corsHeaders
    );
  } catch (error) {
    logError('mpesa-callback', error, { fatal: true });
    return secureResponse(
      JSON.stringify({ ResultCode: 1, ResultDesc: 'Internal error' }),
      200, corsHeaders
    );
  }
});
