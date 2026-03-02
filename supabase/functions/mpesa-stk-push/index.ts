/**
 * M-Pesa STK Push Edge Function
 * 
 * Initiates M-Pesa STK Push payment requests
 * 
 * SECURITY:
 * - JWT authentication required
 * - Business membership verification
 * - Rate limited (sensitive: 5/hour per IP, 3/hour per user)
 * - Input validation with Zod
 * - Body size limiting via parseJsonBody
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { verifyAuth, createServiceClient } from "../_shared/auth.ts";
import { verifyBusinessMembership } from "../_shared/auth.ts";
import { rateLimit, DEFAULT_LIMITS } from "../_shared/rate-limiter.ts";
import { logError, logSecurityEvent, internalError, badRequest } from "../_shared/errors.ts";
import { parseJsonBody, validateInput } from "../_shared/validators.ts";

const STKPushSchema = z.object({
  phone: z.string().min(9).max(15).regex(/^(?:\+254|254|0)?[17]\d{8}$/, 'Invalid Kenyan phone number'),
  amount: z.number().min(1).max(150000),
  reference: z.string().min(1).max(20),
  description: z.string().max(100).optional(),
  businessId: z.string().uuid(),
}).strict();

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('+254')) return cleaned.substring(1);
  if (cleaned.startsWith('254')) return cleaned;
  if (cleaned.startsWith('0')) return '254' + cleaned.substring(1);
  return '254' + cleaned;
}

function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  return btoa(shortcode + passkey + timestamp);
}

function getTimestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

async function getAccessToken(consumerKey: string, consumerSecret: string, sandbox: boolean = true): Promise<string> {
  const baseUrl = sandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';
  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: { 'Authorization': `Basic ${auth}` },
  });
  if (!response.ok) throw new Error('Failed to get M-Pesa access token');
  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders('*');

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting (sensitive: 5/hour per IP)
    const ipRateCheck = rateLimit(req, null, {
      ...DEFAULT_LIMITS.sensitive,
      keyPrefix: 'mpesa-stk-push',
    }, corsHeaders);

    if (!ipRateCheck.allowed) {
      logSecurityEvent('rate_limit_exceeded', { endpoint: 'mpesa-stk-push', type: 'ip' });
      return ipRateCheck.response!;
    }

    // Auth verification
    const { user, supabase, error: authError } = await verifyAuth(req, corsHeaders);
    if (authError) return authError;

    // User-based rate limiting
    const userRateCheck = rateLimit(req, user!.id, {
      ...DEFAULT_LIMITS.sensitive,
      keyPrefix: 'mpesa-stk-push',
    }, corsHeaders);

    if (!userRateCheck.allowed) {
      logSecurityEvent('rate_limit_exceeded', { endpoint: 'mpesa-stk-push', type: 'user', userId: user!.id });
      return userRateCheck.response!;
    }

    // Check M-Pesa configuration
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL");
    const isSandbox = Deno.env.get("MPESA_SANDBOX") !== 'false';

    if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
      return secureResponse(
        JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'M-Pesa not configured' } }),
        503, corsHeaders
      );
    }

    // Parse and validate body with size limit
    const { data: rawBody, error: parseError } = await parseJsonBody(req, corsHeaders);
    if (parseError) return parseError;

    const validation = validateInput(STKPushSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.error!;

    const { phone, amount, reference, description, businessId } = validation.data!;

    // Verify business membership
    const isMember = await verifyBusinessMembership(supabase!, user!.id, businessId);
    if (!isMember) {
      logSecurityEvent('unauthorized_business_access', { userId: user!.id, businessId });
      return secureResponse(
        JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Access denied' } }),
        403, corsHeaders
      );
    }

    // Prepare M-Pesa request
    const timestamp = getTimestamp();
    const password = generatePassword(shortcode, passkey, timestamp);
    const normalizedPhone = normalizePhone(phone);
    const accessToken = await getAccessToken(consumerKey, consumerSecret, isSandbox);

    // Create transaction record
    const adminClient = createServiceClient();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const { data: transaction, error: txError } = await adminClient
      .from('transactions')
      .insert({
        business_id: businessId,
        user_id: user!.id,
        type: 'deposit',
        amount,
        currency: 'KES',
        status: 'pending',
        payment_method: 'mpesa',
        reference,
        description: description || 'M-Pesa Payment',
        recipient_phone: normalizedPhone,
        metadata: { initiated_at: new Date().toISOString(), channel: 'stk_push' },
      })
      .select()
      .single();

    if (txError) {
      logError('mpesa-stk-push', txError, { step: 'create_transaction' });
      return internalError(corsHeaders, 'Failed to create transaction record');
    }

    logSecurityEvent('mpesa_stk_initiated', { transactionId: transaction.id, userId: user!.id, businessId });

    // Initiate STK Push
    const baseUrl = isSandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: normalizedPhone,
        PartyB: shortcode,
        PhoneNumber: normalizedPhone,
        CallBackURL: callbackUrl || `${supabaseUrl}/functions/v1/mpesa-callback`,
        AccountReference: reference,
        TransactionDesc: description || 'Payment',
      }),
    });

    const stkResult = await stkResponse.json();

    if (stkResult.ResponseCode === '0') {
      await adminClient.from('transactions').update({
        external_reference: stkResult.CheckoutRequestID,
        metadata: {
          ...transaction.metadata,
          merchant_request_id: stkResult.MerchantRequestID,
          checkout_request_id: stkResult.CheckoutRequestID,
        },
      }).eq('id', transaction.id);

      return secureResponse(JSON.stringify({
        success: true,
        message: 'STK Push initiated successfully',
        transactionId: transaction.id,
        checkoutRequestId: stkResult.CheckoutRequestID,
        merchantRequestId: stkResult.MerchantRequestID,
      }), 200, corsHeaders);
    } else {
      await adminClient.from('transactions').update({
        status: 'failed',
        metadata: {
          ...transaction.metadata,
          error: stkResult.errorMessage || stkResult.ResponseDescription,
          response_code: stkResult.ResponseCode,
        },
      }).eq('id', transaction.id);

      logError('mpesa-stk-push', new Error(stkResult.errorMessage || stkResult.ResponseDescription), { transactionId: transaction.id });

      return secureResponse(JSON.stringify({
        success: false,
        error: stkResult.errorMessage || stkResult.ResponseDescription || 'STK Push failed',
        transactionId: transaction.id,
      }), 400, corsHeaders);
    }
  } catch (error) {
    logError('mpesa-stk-push', error, { fatal: true });
    return internalError(corsHeaders);
  }
});
