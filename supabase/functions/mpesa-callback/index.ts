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
        .eq('id', transaction.id);

      if (updateError) {
        logError('mpesa-callback', updateError, { step: 'update_completed', transactionId: transaction.id });
      } else {
        logSecurityEvent('mpesa_payment_completed', { transactionId: transaction.id, receipt: metadata.mpesa_receipt });

        // Update wallet balance
        if (transaction.wallet_id) {
          const { data: wallet } = await supabase
            .from('wallets').select('balance').eq('id', transaction.wallet_id).single();
          if (wallet) {
            await supabase.from('wallets').update({
              balance: Number(wallet.balance) + Number(transaction.amount),
              updated_at: new Date().toISOString(),
            }).eq('id', transaction.wallet_id);
          }
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
