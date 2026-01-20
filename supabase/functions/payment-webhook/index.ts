/**
 * Payment Webhook Edge Function
 * Handles incoming webhooks from payment providers (M-Pesa, Stripe, etc.)
 * Updates transaction status and wallet balances
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createServiceClient } from '../_shared/auth.ts';
import { getCorsHeaders, secureResponse } from '../_shared/security-headers.ts';
import { badRequest, internalError, logError, logSecurityEvent } from '../_shared/errors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Webhook payload schemas for different providers
const MpesaCallbackSchema = z.object({
  Body: z.object({
    stkCallback: z.object({
      MerchantRequestID: z.string(),
      CheckoutRequestID: z.string(),
      ResultCode: z.number(),
      ResultDesc: z.string(),
      CallbackMetadata: z.object({
        Item: z.array(z.object({
          Name: z.string(),
          Value: z.union([z.string(), z.number()]).optional(),
        })),
      }).optional(),
    }),
  }),
});

const StripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
});

const GenericWebhookSchema = z.object({
  event: z.string(),
  reference: z.string(),
  status: z.enum(['success', 'failed', 'pending']),
  amount: z.number().optional(),
  currency: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Verify webhook signature using Web Crypto API
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders('*', origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return badRequest('Method not allowed', corsHeaders);
  }

  try {
    const serviceClient = createServiceClient();
    const rawBody = await req.text();
    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return badRequest('Invalid JSON body', corsHeaders);
    }

    // Determine webhook source from headers
    const webhookSource = req.headers.get('x-webhook-source') || 
                          (req.headers.get('stripe-signature') ? 'stripe' : null) ||
                          (body && typeof body === 'object' && 'Body' in body ? 'mpesa' : 'generic');

    logSecurityEvent('WEBHOOK_RECEIVED', {
      source: webhookSource,
      timestamp: new Date().toISOString(),
    });

    let transactionReference: string | null = null;
    let newStatus: 'completed' | 'failed' | 'pending' = 'pending';
    let externalReference: string | null = null;
    let amount: number | null = null;

    switch (webhookSource) {
      case 'mpesa': {
        const mpesaValidation = MpesaCallbackSchema.safeParse(body);
        if (!mpesaValidation.success) {
          logError('MPESA_WEBHOOK_VALIDATION', mpesaValidation.error);
          return badRequest('Invalid M-Pesa callback format', corsHeaders);
        }

        const callback = mpesaValidation.data.Body.stkCallback;
        
        // Extract reference from CheckoutRequestID (format: MPESA-TXN-xxx)
        transactionReference = callback.CheckoutRequestID.replace('MPESA-', '');
        externalReference = callback.MerchantRequestID;
        
        if (callback.ResultCode === 0) {
          newStatus = 'completed';
          // Extract amount from metadata
          const amountItem = callback.CallbackMetadata?.Item.find(i => i.Name === 'Amount');
          amount = amountItem?.Value as number || null;
        } else {
          newStatus = 'failed';
        }

        logSecurityEvent('MPESA_CALLBACK_PROCESSED', {
          checkoutRequestId: callback.CheckoutRequestID,
          resultCode: callback.ResultCode,
          resultDesc: callback.ResultDesc,
        });
        break;
      }

      case 'stripe': {
        // Verify Stripe signature
        const stripeSignature = req.headers.get('stripe-signature');
        const stripeSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
        
        if (stripeSecret && stripeSignature) {
          const isValid = await verifySignature(rawBody, stripeSignature.split('=')[1] || '', stripeSecret);
          if (!isValid) {
            logSecurityEvent('STRIPE_SIGNATURE_INVALID', { signature: stripeSignature });
            return badRequest('Invalid signature', corsHeaders);
          }
        }

        const stripeValidation = StripeWebhookSchema.safeParse(body);
        if (!stripeValidation.success) {
          return badRequest('Invalid Stripe webhook format', corsHeaders);
        }

        const event = stripeValidation.data;
        const paymentIntent = event.data.object as Record<string, unknown>;

        const metadata = paymentIntent.metadata as Record<string, unknown> | undefined;
        
        switch (event.type) {
          case 'payment_intent.succeeded':
            newStatus = 'completed';
            transactionReference = metadata?.reference as string || null;
            externalReference = paymentIntent.id as string;
            amount = (paymentIntent.amount as number) / 100; // Stripe amounts are in cents
            break;
          case 'payment_intent.payment_failed':
            newStatus = 'failed';
            transactionReference = metadata?.reference as string || null;
            break;
          default:
            // Acknowledge but don't process other events
            return secureResponse(JSON.stringify({ received: true }), 200, corsHeaders);
        }
        break;
      }

      default: {
        // Generic webhook format
        const genericValidation = GenericWebhookSchema.safeParse(body);
        if (!genericValidation.success) {
          return badRequest('Invalid webhook format', corsHeaders);
        }

        const data = genericValidation.data;
        transactionReference = data.reference;
        newStatus = data.status === 'success' ? 'completed' : data.status;
        amount = data.amount || null;
        break;
      }
    }

    if (!transactionReference) {
      return badRequest('Transaction reference not found', corsHeaders);
    }

    // Find the transaction
    const { data: transaction, error: txError } = await serviceClient
      .from('transactions')
      .select('*, wallets(*)')
      .eq('reference', transactionReference)
      .maybeSingle();

    if (txError || !transaction) {
      logError('TRANSACTION_NOT_FOUND', { reference: transactionReference, error: txError });
      return badRequest('Transaction not found', corsHeaders);
    }

    // Idempotency check - don't reprocess completed/failed transactions
    if (transaction.status === 'completed' || transaction.status === 'failed') {
      logSecurityEvent('DUPLICATE_WEBHOOK', {
        transactionId: transaction.id,
        currentStatus: transaction.status,
        newStatus,
      });
      return secureResponse(JSON.stringify({ 
        received: true, 
        message: 'Transaction already processed' 
      }), 200, corsHeaders);
    }

    // Update transaction status
    const { error: updateError } = await serviceClient
      .from('transactions')
      .update({
        status: newStatus,
        external_reference: externalReference,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        metadata: {
          ...transaction.metadata,
          webhook_received_at: new Date().toISOString(),
          webhook_source: webhookSource,
        },
      })
      .eq('id', transaction.id);

    if (updateError) {
      logError('UPDATE_TRANSACTION_ERROR', updateError);
      return internalError(corsHeaders);
    }

    // Update wallet balance for successful deposits
    if (newStatus === 'completed' && transaction.type === 'deposit' && transaction.wallet_id) {
      const currentBalance = transaction.wallets?.balance || 0;
      const depositAmount = amount || transaction.amount;

      const { error: walletError } = await serviceClient
        .from('wallets')
        .update({
          balance: currentBalance + depositAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.wallet_id);

      if (walletError) {
        logError('UPDATE_WALLET_BALANCE_ERROR', walletError);
        // Don't fail the webhook, log for manual reconciliation
      }
    }

    // Create notification for user
    await serviceClient
      .from('notifications')
      .insert({
        business_id: transaction.business_id,
        user_id: transaction.user_id,
        type: 'new_order',
        title: newStatus === 'completed' 
          ? `Payment ${transaction.type} Successful` 
          : `Payment ${transaction.type} Failed`,
        body: newStatus === 'completed'
          ? `${transaction.currency} ${transaction.amount.toLocaleString()} has been ${transaction.type === 'deposit' ? 'added to' : 'processed from'} your wallet`
          : `Your ${transaction.type} of ${transaction.currency} ${transaction.amount.toLocaleString()} could not be processed`,
        data: {
          transaction_id: transaction.id,
          reference: transactionReference,
          status: newStatus,
        },
      });

    logSecurityEvent('PAYMENT_WEBHOOK_PROCESSED', {
      transactionId: transaction.id,
      reference: transactionReference,
      previousStatus: transaction.status,
      newStatus,
      source: webhookSource,
    });

    return secureResponse(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        status: newStatus,
      }),
      200,
      corsHeaders
    );

  } catch (error) {
    logError('PAYMENT_WEBHOOK_UNHANDLED', error);
    return internalError(corsHeaders);
  }
});
