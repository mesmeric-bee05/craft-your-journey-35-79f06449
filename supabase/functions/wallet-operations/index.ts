/**
 * Wallet Operations Edge Function
 * Handles wallet balance operations: check balance, transfer, withdraw
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { verifyAuth, createServiceClient } from '../_shared/auth.ts';
import { rateLimit, DEFAULT_LIMITS } from '../_shared/rate-limiter.ts';
import { getCorsHeaders, secureResponse } from '../_shared/security-headers.ts';
import { badRequest, internalError, logError, logSecurityEvent } from '../_shared/errors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Input validation schemas
const GetBalanceSchema = z.object({
  action: z.literal('get_balance'),
  business_id: z.string().uuid(),
});

const TransferSchema = z.object({
  action: z.literal('transfer'),
  business_id: z.string().uuid(),
  recipient_user_id: z.string().uuid(),
  amount: z.number().positive().max(1000000),
  description: z.string().max(500).optional(),
});

const WithdrawSchema = z.object({
  action: z.literal('withdraw'),
  business_id: z.string().uuid(),
  amount: z.number().positive().max(1000000),
  payment_method: z.enum(['mpesa', 'bank_transfer']),
  recipient_phone: z.string().optional(),
  bank_details: z.object({
    bank_code: z.string(),
    account_number: z.string(),
    account_name: z.string(),
  }).optional(),
});

const GetTransactionsSchema = z.object({
  action: z.literal('get_transactions'),
  business_id: z.string().uuid(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  type: z.enum(['deposit', 'withdrawal', 'payment', 'refund', 'transfer']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
});

const WalletOperationSchema = z.discriminatedUnion('action', [
  GetBalanceSchema,
  TransferSchema,
  WithdrawSchema,
  GetTransactionsSchema,
]);

type WalletOperation = z.infer<typeof WalletOperationSchema>;

// Generate unique transaction reference
function generateReference(prefix: string = 'TXN'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
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

    // Apply rate limiting
    const rateLimitResult = await rateLimit(
      req,
      user!.id,
      { ...DEFAULT_LIMITS.standard, keyPrefix: 'wallet-operations' },
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

    const validation = WalletOperationSchema.safeParse(body);
    if (!validation.success) {
      return badRequest('Validation failed', corsHeaders, validation.error.errors);
    }

    const input: WalletOperation = validation.data;
    const serviceClient = createServiceClient();

    // Verify business membership for all operations
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
      return badRequest('You are not authorized to access this wallet', corsHeaders);
    }

    // Get user's wallet
    const { data: wallet } = await supabase!
      .from('wallets')
      .select('*')
      .eq('business_id', input.business_id)
      .eq('user_id', user!.id)
      .maybeSingle();

    switch (input.action) {
      case 'get_balance': {
        if (!wallet) {
          // Create wallet if doesn't exist
          const { data: newWallet, error: createError } = await serviceClient
            .from('wallets')
            .insert({
              business_id: input.business_id,
              user_id: user!.id,
              balance: 0,
              currency: 'KES',
            })
            .select()
            .single();

          if (createError) {
            logError('CREATE_WALLET_ERROR', createError);
            return internalError(corsHeaders);
          }

          return secureResponse(
            JSON.stringify({
              success: true,
              wallet: {
                id: newWallet.id,
                balance: 0,
                currency: 'KES',
                is_active: true,
              },
            }),
            200,
            corsHeaders
          );
        }

        return secureResponse(
          JSON.stringify({
            success: true,
            wallet: {
              id: wallet.id,
              balance: wallet.balance,
              currency: wallet.currency,
              is_active: wallet.is_active,
            },
          }),
          200,
          corsHeaders
        );
      }

      case 'transfer': {
        if (!wallet) {
          return badRequest('Wallet not found', corsHeaders);
        }

        if (wallet.balance < input.amount) {
          return badRequest('Insufficient balance', corsHeaders);
        }

        if (input.recipient_user_id === user!.id) {
          return badRequest('Cannot transfer to yourself', corsHeaders);
        }

        // Get recipient wallet
        const { data: recipientWallet } = await serviceClient
          .from('wallets')
          .select('*')
          .eq('business_id', input.business_id)
          .eq('user_id', input.recipient_user_id)
          .maybeSingle();

        if (!recipientWallet) {
          return badRequest('Recipient wallet not found', corsHeaders);
        }

        const reference = generateReference('TRF');

        // Create debit transaction for sender
        const { data: debitTx, error: debitError } = await serviceClient
          .from('transactions')
          .insert({
            business_id: input.business_id,
            wallet_id: wallet.id,
            user_id: user!.id,
            type: 'transfer',
            amount: input.amount,
            currency: wallet.currency,
            status: 'completed',
            description: input.description || `Transfer to user`,
            reference,
            payment_method: 'wallet',
            completed_at: new Date().toISOString(),
            metadata: {
              transfer_type: 'debit',
              recipient_user_id: input.recipient_user_id,
            },
          })
          .select()
          .single();

        if (debitError) {
          logError('CREATE_DEBIT_TX_ERROR', debitError);
          return internalError(corsHeaders);
        }

        // Create credit transaction for recipient
        await serviceClient
          .from('transactions')
          .insert({
            business_id: input.business_id,
            wallet_id: recipientWallet.id,
            user_id: input.recipient_user_id,
            type: 'transfer',
            amount: input.amount,
            currency: wallet.currency,
            status: 'completed',
            description: input.description || `Transfer from user`,
            reference: `${reference}-CR`,
            payment_method: 'wallet',
            completed_at: new Date().toISOString(),
            metadata: {
              transfer_type: 'credit',
              sender_user_id: user!.id,
              original_reference: reference,
            },
          });

        // Update sender wallet
        await serviceClient
          .from('wallets')
          .update({
            balance: wallet.balance - input.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);

        // Update recipient wallet
        await serviceClient
          .from('wallets')
          .update({
            balance: recipientWallet.balance + input.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recipientWallet.id);

        // Notify recipient
        await serviceClient
          .from('notifications')
          .insert({
            business_id: input.business_id,
            user_id: input.recipient_user_id,
            type: 'new_order',
            title: 'Money Received',
            body: `You received ${wallet.currency} ${input.amount.toLocaleString()} via wallet transfer`,
            data: {
              transaction_id: debitTx.id,
              reference,
              amount: input.amount,
            },
          });

        logSecurityEvent('WALLET_TRANSFER_COMPLETED', {
          senderId: user!.id,
          recipientId: input.recipient_user_id,
          amount: input.amount,
          reference,
        });

        return secureResponse(
          JSON.stringify({
            success: true,
            transaction: {
              id: debitTx.id,
              reference,
              amount: input.amount,
              currency: wallet.currency,
              status: 'completed',
            },
            new_balance: wallet.balance - input.amount,
          }),
          200,
          corsHeaders
        );
      }

      case 'withdraw': {
        if (!wallet) {
          return badRequest('Wallet not found', corsHeaders);
        }

        if (wallet.balance < input.amount) {
          return badRequest('Insufficient balance', corsHeaders);
        }

        const reference = generateReference('WDR');

        // Validate payment method requirements
        if (input.payment_method === 'mpesa' && !input.recipient_phone) {
          return badRequest('Phone number required for M-Pesa withdrawal', corsHeaders);
        }

        if (input.payment_method === 'bank_transfer' && !input.bank_details) {
          return badRequest('Bank details required for bank transfer', corsHeaders);
        }

        // Create withdrawal transaction
        const { data: transaction, error: txError } = await serviceClient
          .from('transactions')
          .insert({
            business_id: input.business_id,
            wallet_id: wallet.id,
            user_id: user!.id,
            type: 'withdrawal',
            amount: input.amount,
            currency: wallet.currency,
            status: 'pending',
            reference,
            payment_method: input.payment_method,
            recipient_phone: input.recipient_phone,
            metadata: {
              bank_details: input.bank_details,
              requested_at: new Date().toISOString(),
            },
          })
          .select()
          .single();

        if (txError) {
          logError('CREATE_WITHDRAWAL_TX_ERROR', txError);
          return internalError(corsHeaders);
        }

        // Deduct from wallet immediately (hold)
        await serviceClient
          .from('wallets')
          .update({
            balance: wallet.balance - input.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', wallet.id);

        logSecurityEvent('WITHDRAWAL_INITIATED', {
          userId: user!.id,
          amount: input.amount,
          paymentMethod: input.payment_method,
          reference,
        });

        return secureResponse(
          JSON.stringify({
            success: true,
            transaction: {
              id: transaction.id,
              reference,
              amount: input.amount,
              currency: wallet.currency,
              status: 'pending',
              payment_method: input.payment_method,
            },
            message: input.payment_method === 'mpesa' 
              ? 'Withdrawal initiated. You will receive the funds via M-Pesa shortly.'
              : 'Withdrawal initiated. Bank transfer will be processed within 1-3 business days.',
            new_balance: wallet.balance - input.amount,
          }),
          200,
          corsHeaders
        );
      }

      case 'get_transactions': {
        let query = supabase!
          .from('transactions')
          .select('*', { count: 'exact' })
          .eq('business_id', input.business_id)
          .order('created_at', { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.type) {
          query = query.eq('type', input.type);
        }

        if (input.status) {
          query = query.eq('status', input.status);
        }

        const { data: transactions, count, error } = await query;

        if (error) {
          logError('GET_TRANSACTIONS_ERROR', error);
          return internalError(corsHeaders);
        }

        return secureResponse(
          JSON.stringify({
            success: true,
            transactions: transactions || [],
            pagination: {
              total: count || 0,
              limit: input.limit,
              offset: input.offset,
              has_more: (count || 0) > input.offset + input.limit,
            },
          }),
          200,
          corsHeaders
        );
      }

      default:
        return badRequest('Invalid action', corsHeaders);
    }

  } catch (error) {
    logError('WALLET_OPERATIONS_UNHANDLED', error);
    return internalError(corsHeaders);
  }
});
