/**
 * Process Payment Edge Function
 * Handles payment initiation for deposits, withdrawals, and transfers
 * Supports M-Pesa, card payments, and bank transfers
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuth, createServiceClient } from '../_shared/auth.ts';
import { rateLimit, DEFAULT_LIMITS } from '../_shared/rate-limiter.ts';
import { getCorsHeaders, secureResponse } from '../_shared/security-headers.ts';
import { badRequest, internalError, logError, logSecurityEvent } from '../_shared/errors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Input validation schemas
const ProcessPaymentSchema = z.object({
  business_id: z.string().uuid(),
  type: z.enum(['deposit', 'withdrawal', 'payment', 'transfer']),
  amount: z.number().positive().max(1000000),
  currency: z.string().default('KES'),
  payment_method: z.enum(['mpesa', 'card', 'bank_transfer', 'wallet']),
  recipient_phone: z.string().optional(),
  recipient_email: z.string().email().optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

type ProcessPaymentInput = z.infer<typeof ProcessPaymentSchema>;

// Generate unique transaction reference
function generateReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
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
    // Verify authentication
    const { user, supabase, error: authError } = await verifyAuth(req, corsHeaders);
    if (authError) return authError;

    // Apply rate limiting (sensitive endpoint)
    const rateLimitResult = await rateLimit(
      req,
      user!.id,
      { ...DEFAULT_LIMITS.sensitive, keyPrefix: 'process-payment' },
      corsHeaders
    );
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest('Invalid JSON body', corsHeaders);
    }

    const validation = ProcessPaymentSchema.safeParse(body);
    if (!validation.success) {
      return badRequest('Validation failed', corsHeaders, validation.error.errors);
    }

    const input: ProcessPaymentInput = validation.data;

    // Verify business membership
    const { data: membership } = await supabase!
      .from('business_members')
      .select('id')
      .eq('business_id', input.business_id)
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .maybeSingle();

    const { data: business } = await supabase!
      .from('businesses')
      .select('owner_id')
      .eq('id', input.business_id)
      .maybeSingle();

    if (!membership && business?.owner_id !== user!.id) {
      logSecurityEvent('UNAUTHORIZED_PAYMENT_ATTEMPT', {
        userId: user!.id,
        businessId: input.business_id,
      });
      return badRequest('You are not authorized to process payments for this business', corsHeaders);
    }

    // Get or create wallet
    const serviceClient = createServiceClient();
    const { data: existingWallet } = await serviceClient
      .from('wallets')
      .select('*')
      .eq('business_id', input.business_id)
      .eq('user_id', user!.id)
      .maybeSingle();

    let walletData = existingWallet;

    if (!walletData) {
      const { data: newWallet, error: walletError } = await serviceClient
        .from('wallets')
        .insert({
          business_id: input.business_id,
          user_id: user!.id,
          balance: 0,
          currency: input.currency,
        })
        .select()
        .single();

      if (walletError) {
        logError('CREATE_WALLET_ERROR', walletError);
        return internalError(corsHeaders);
      }
      walletData = newWallet;
    }

    // Validate withdrawal/payment against balance
    if ((input.type === 'withdrawal' || input.type === 'payment' || input.type === 'transfer') 
        && walletData.balance < input.amount) {
      return badRequest('Insufficient wallet balance', corsHeaders);
    }

    // Generate unique reference
    const reference = generateReference();

    // Create transaction record
    const { data: transaction, error: txError } = await serviceClient
      .from('transactions')
      .insert({
        business_id: input.business_id,
        wallet_id: walletData.id,
        user_id: user!.id,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        status: 'pending',
        description: input.description,
        reference,
        payment_method: input.payment_method,
        recipient_phone: input.recipient_phone,
        recipient_email: input.recipient_email,
        metadata: {
          ...input.metadata,
          initiated_at: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        },
      })
      .select()
      .single();

    if (txError) {
      logError('CREATE_TRANSACTION_ERROR', txError);
      return internalError(corsHeaders);
    }

    // Log security event
    logSecurityEvent('PAYMENT_INITIATED', {
      transactionId: transaction.id,
      userId: user!.id,
      businessId: input.business_id,
      type: input.type,
      amount: input.amount,
      paymentMethod: input.payment_method,
    });

    // Process based on payment method
    let paymentResponse: Record<string, unknown> = {};

    switch (input.payment_method) {
      case 'mpesa':
        // In production, integrate with M-Pesa API (Safaricom Daraja)
        paymentResponse = {
          status: 'pending',
          message: 'M-Pesa payment initiated. Please check your phone for the STK push.',
          checkout_request_id: `MPESA-${reference}`,
          instructions: [
            '1. You will receive an M-Pesa prompt on your phone',
            '2. Enter your M-Pesa PIN to complete the payment',
            '3. You will receive a confirmation SMS',
          ],
        };
        break;

      case 'card':
        // In production, integrate with Stripe/PayStack/Flutterwave
        paymentResponse = {
          status: 'pending',
          message: 'Card payment requires additional verification',
          payment_url: `https://pay.example.com/checkout/${reference}`,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
        break;

      case 'bank_transfer':
        paymentResponse = {
          status: 'pending',
          message: 'Bank transfer instructions sent',
          bank_details: {
            bank_name: 'Example Bank',
            account_number: '1234567890',
            account_name: 'Business Payments',
            reference: reference,
          },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
        break;

      case 'wallet':
        // Direct wallet deduction for transfers
        if (input.type === 'transfer' || input.type === 'payment') {
          // Atomically deduct from sender wallet (guards against concurrent spends)
          const { data: newBalance, error: deductError } = await serviceClient
            .rpc('wallet_debit', { p_wallet_id: walletData.id, p_amount: input.amount });

          if (deductError) {
            // Rollback transaction status
            await serviceClient
              .from('transactions')
              .update({ status: 'failed' })
              .eq('id', transaction.id);

            logError('WALLET_DEDUCT_ERROR', deductError);
            return badRequest('Insufficient wallet balance', corsHeaders);
          }

          // Mark transaction as completed
          await serviceClient
            .from('transactions')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', transaction.id);

          paymentResponse = {
            status: 'completed',
            message: 'Wallet payment processed successfully',
            new_balance: Number(newBalance),
          };

        }
        break;
    }

    // Create notification for the user
    await serviceClient
      .from('notifications')
      .insert({
        business_id: input.business_id,
        user_id: user!.id,
        type: 'new_order',
        title: `Payment ${input.type === 'deposit' ? 'Deposit' : 'Initiated'}`,
        body: `${input.currency} ${input.amount.toLocaleString()} ${input.type} via ${input.payment_method}`,
        data: {
          transaction_id: transaction.id,
          reference,
          type: input.type,
          amount: input.amount,
        },
      });

    return secureResponse(
      JSON.stringify({
        success: true,
        transaction: {
          id: transaction.id,
          reference,
          type: input.type,
          amount: input.amount,
          currency: input.currency,
          status: paymentResponse.status || 'pending',
        },
        payment: paymentResponse,
      }),
      200,
      corsHeaders
    );

  } catch (error) {
    logError('PROCESS_PAYMENT_UNHANDLED', error);
    return internalError(corsHeaders);
  }
});
