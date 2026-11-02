/**
 * Payment Webhook Edge Function
 * Handles incoming webhooks from payment providers (M-Pesa, Stripe, etc.)
 * Updates transaction status and wallet balances
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { verifyCallbackSource } from "../_shared/callback-auth.ts";
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

// Verify Stripe's timestamped signature over `${timestamp}.${rawBody}`.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length != b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  const parts = header.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3));
  const timestampSeconds = Number(timestamp);
  if (!timestamp || !Number.isInteger(timestampSeconds) || Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > 300) return false;
  if (signatures.length === 0) return false;
  const expected = await hmacHex(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => timingSafeEqual(signature.toLowerCase(), expected));
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
    let providerEventId: string | null = null;

    switch (webhookSource) {
      case 'mpesa': {
        // M-Pesa sends no signature; only callbacks carrying our secret callback token are trusted.
        if (!verifyCallbackSource(req).ok) {
          logSecurityEvent('WEBHOOK_REJECTED', { source: 'mpesa', reason: 'bad_callback_token' });
          return new Response(JSON.stringify({ error: 'unauthorized' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const mpesaValidation = MpesaCallbackSchema.safeParse(body);
        if (!mpesaValidation.success) {
          logError('MPESA_WEBHOOK_VALIDATION', mpesaValidation.error);
          return badRequest('Invalid M-Pesa callback format', corsHeaders);
        }

        const callback = mpesaValidation.data.Body.stkCallback;
        providerEventId = callback.CheckoutRequestID || callback.MerchantRequestID;
        
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
        // Fail-closed: require STRIPE_WEBHOOK_SECRET and a valid stripe-signature header.
        const stripeSignature = req.headers.get('stripe-signature');
        const stripeSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
        if (!stripeSecret || !stripeSignature) {
          logSecurityEvent('STRIPE_SIGNATURE_MISSING', { hasSecret: !!stripeSecret, hasSig: !!stripeSignature });
          return badRequest('Stripe signature required', corsHeaders);
        }
        const isValid = await verifyStripeSignature(rawBody, stripeSignature, stripeSecret);
        if (!isValid) {
          logSecurityEvent('STRIPE_SIGNATURE_INVALID', { hasSignature: true });
          return badRequest('Invalid signature', corsHeaders);
        }

        const stripeValidation = StripeWebhookSchema.safeParse(body);
        if (!stripeValidation.success) {
          return badRequest('Invalid Stripe webhook format', corsHeaders);
        }

        const event = stripeValidation.data;
        providerEventId = event.id;
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
        // Generic / unauthenticated webhook path removed for security.
        // Only signed Stripe events or M-Pesa STK callbacks are accepted.
        logSecurityEvent('UNKNOWN_WEBHOOK_SOURCE_REJECTED', {
          source: webhookSource,
          hasStripeSig: !!req.headers.get('stripe-signature'),
        });
        return badRequest('Unsupported webhook source', corsHeaders);
      }
    }



    if (!transactionReference) {
      return badRequest('Transaction reference not found', corsHeaders);
    }

    if (!providerEventId) {
      return badRequest('Webhook event identifier not found', corsHeaders);
    }
    const { data: settlement, error: settlementError } = await serviceClient.rpc('apply_payment_webhook', {
      p_provider: webhookSource,
      p_event_id: providerEventId,
      p_transaction_reference: transactionReference,
      p_status: newStatus,
      p_external_reference: externalReference,
      p_amount: amount,
      p_metadata: { webhook_received_at: new Date().toISOString(), webhook_source: webhookSource },
      p_payload: body,
    });
    if (settlementError) {
      logError('PAYMENT_WEBHOOK_SETTLEMENT_ERROR', settlementError);
      return internalError(corsHeaders);
    }
    const transaction = settlement as {
      accepted?: boolean;
      duplicate?: boolean;
      error?: string;
      transaction_id?: string;
      business_id?: string;
      user_id?: string;
      type?: string;
      currency?: string;
      amount?: number;
      previous_status?: string;
      status?: string;
    };
    if (!transaction.accepted) {
      logError('PAYMENT_WEBHOOK_REJECTED', { reference: transactionReference, error: transaction.error });
      return badRequest(transaction.error || 'Payment webhook rejected', corsHeaders);
    }
    if (transaction.duplicate) {
      logSecurityEvent('DUPLICATE_WEBHOOK', { provider: webhookSource, eventId: providerEventId });
      return secureResponse(JSON.stringify({ received: true, duplicate: true }), 200, corsHeaders);
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
          ? `${transaction.currency} ${Number(transaction.amount ?? 0).toLocaleString()} has been ${transaction.type === 'deposit' ? 'added to' : 'processed from'} your wallet`
          : `Your ${transaction.type} of ${transaction.currency} ${Number(transaction.amount ?? 0).toLocaleString()} could not be processed`,
        data: {
          transaction_id: transaction.transaction_id,
          reference: transactionReference,
          status: newStatus,
        },
      });

    logSecurityEvent('PAYMENT_WEBHOOK_PROCESSED', {
      transactionId: transaction.transaction_id,
      reference: transactionReference,
      previousStatus: transaction.previous_status,
      newStatus,
      source: webhookSource,
    });

    return secureResponse(
      JSON.stringify({
        success: true,
        transaction_id: transaction.transaction_id,
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
