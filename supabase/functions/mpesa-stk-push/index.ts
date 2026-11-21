/**
 * M-Pesa STK Push Edge Function
 *
 * Initiates M-Pesa STK Push payment requests.
 *
 * SECURITY:
 * - JWT authentication required
 * - Business membership verification
 * - Amount and recipient are bound server-side:
 *     · charging an existing pending transaction reuses its stored amount and phone;
 *     · an ad-hoc charge requires the caller to be the business owner and the
 *       recipient to be their registered phone or one of their saved customers.
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
import { callbackUrlFor, withCallbackToken } from "../_shared/callback-auth.ts";
import { mpesaEnv, mpesaTransactionMode } from "../_shared/mpesa-stk.ts";

const STKPushSchema = z.object({
  businessId: z.string().uuid(),
  /**
   * Charge an already-stored pending transaction. When present the stored amount
   * and recipient phone win, so the client cannot choose what is charged.
   */
  transactionId: z.string().uuid().optional(),
  /** Ad-hoc charge fields (business owner only). */
  phone: z.string().min(9).max(15).regex(/^(?:\+254|254|0)?[17]\d{8}$/, 'Invalid Kenyan phone number').optional(),
  amount: z.number().min(1).max(150000).optional(),
  reference: z.string().min(1).max(20).optional(),
  description: z.string().max(100).optional(),
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
    const { isSandbox } = mpesaEnv();
    const txMode = mpesaTransactionMode();

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

    const { phone, amount, reference, description, businessId, transactionId } = validation.data!;

    // Verify business membership
    const isMember = await verifyBusinessMembership(supabase!, user!.id, businessId);
    if (!isMember) {
      logSecurityEvent('unauthorized_business_access', { userId: user!.id, businessId });
      return secureResponse(
        JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Access denied' } }),
        403, corsHeaders
      );
    }

    const adminClient = createServiceClient();

    let chargeAmount: number;
    let normalizedPhone: string;
    let referenceCode: string;
    let descriptionText: string;
    let existingTransactionId: string | null = null;
    let existingMetadata: Record<string, unknown> = {};

    if (transactionId) {
      // Server-bound charge: the stored transaction decides amount and recipient.
      const { data: bound, error: boundError } = await adminClient
        .from('transactions')
        .select('id, business_id, amount, recipient_phone, status, reference, description, metadata')
        .eq('id', transactionId)
        .maybeSingle();

      if (boundError) {
        logError('mpesa-stk-push', boundError, { step: 'load_bound_transaction' });
        return internalError(corsHeaders, 'Failed to load charge');
      }
      if (!bound || bound.business_id !== businessId) {
        logSecurityEvent('mpesa_charge_not_found', { userId: user!.id, businessId, transactionId });
        return secureResponse(
          JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Charge not found' } }),
          404, corsHeaders
        );
      }
      if (bound.status !== 'pending') {
        return badRequest('This charge has already been processed', corsHeaders);
      }

      const storedAmount = Math.round(Number(bound.amount));
      if (!Number.isFinite(storedAmount) || storedAmount < 1) {
        return badRequest('This charge has no valid amount', corsHeaders);
      }
      if (typeof amount === 'number' && Math.round(amount) !== storedAmount) {
        logSecurityEvent('mpesa_charge_amount_mismatch', {
          userId: user!.id, businessId, transactionId, storedAmount, requestedAmount: amount,
        });
        return secureResponse(
          JSON.stringify({ error: { code: 'AMOUNT_MISMATCH', message: 'Amount does not match the stored charge' } }),
          400, corsHeaders
        );
      }
      if (!bound.recipient_phone) {
        return badRequest('This charge has no recipient phone number', corsHeaders);
      }

      chargeAmount = storedAmount;
      normalizedPhone = normalizePhone(String(bound.recipient_phone));
      referenceCode = (bound.reference || '').slice(0, 20) || `SR${Date.now().toString(36).toUpperCase().slice(-8)}`;
      descriptionText = bound.description || description || 'Payment';
      existingTransactionId = bound.id;
      existingMetadata = (bound.metadata || {}) as Record<string, unknown>;
    } else {
      // Ad-hoc charge: owner-only pricing, recipient restricted to known numbers.
      if (typeof amount !== 'number' || !phone || !reference) {
        return badRequest('amount, phone and reference are required', corsHeaders);
      }

      const { data: business, error: businessError } = await adminClient
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .maybeSingle();
      if (businessError) {
        logError('mpesa-stk-push', businessError, { step: 'load_business_owner' });
        return internalError(corsHeaders);
      }

      let maySetPrice = business?.owner_id === user!.id;
      if (!maySetPrice) {
        const { data: adminFlag } = await supabase!.rpc('is_admin', { _user_id: user!.id });
        maySetPrice = adminFlag === true;
      }
      if (!maySetPrice) {
        logSecurityEvent('mpesa_charge_not_permitted', { userId: user!.id, businessId });
        return secureResponse(
          JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Only the business owner can set an M-Pesa charge amount' } }),
          403, corsHeaders
        );
      }

      normalizedPhone = normalizePhone(phone);

      // The prompt may only go to the owner's registered phone or a saved customer.
      const allowedPhones = new Set<string>();
      const { data: ownProfile } = await supabase!
        .from('profiles')
        .select('phone')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (ownProfile?.phone) allowedPhones.add(normalizePhone(String(ownProfile.phone)));

      const { data: customerRows } = await adminClient
        .from('customers')
        .select('phone')
        .eq('business_id', businessId)
        .not('phone', 'is', null)
        .limit(500);
      (customerRows || []).forEach((row: { phone?: string | null }) => {
        if (row.phone) allowedPhones.add(normalizePhone(String(row.phone)));
      });

      if (!allowedPhones.has(normalizedPhone)) {
        logSecurityEvent('mpesa_charge_unverified_phone', { userId: user!.id, businessId });
        return secureResponse(
          JSON.stringify({
            error: {
              code: 'PHONE_NOT_ALLOWED',
              message: 'M-Pesa prompts can only be sent to your registered phone or a saved customer',
            },
          }),
          403, corsHeaders
        );
      }

      chargeAmount = Math.round(amount);
      referenceCode = reference;
      descriptionText = description || 'Payment';
    }

    // Prepare M-Pesa request
    const timestamp = getTimestamp();
    const password = generatePassword(shortcode, passkey, timestamp);
    const accessToken = await getAccessToken(consumerKey, consumerSecret, isSandbox);

    // Record the attempt: reuse the bound transaction, otherwise create one.
    let transactionId_ = existingTransactionId;
    if (!transactionId_) {
      const { data: transaction, error: txError } = await adminClient
        .from('transactions')
        .insert({
          business_id: businessId,
          user_id: user!.id,
          type: 'deposit',
          amount: chargeAmount,
          currency: 'KES',
          status: 'pending',
          payment_method: 'mpesa',
          reference: referenceCode,
          description: descriptionText,
          recipient_phone: normalizedPhone,
          metadata: { initiated_at: new Date().toISOString(), channel: 'stk_push' },
        })
        .select('id, metadata')
        .single();

      if (txError || !transaction) {
        logError('mpesa-stk-push', txError, { step: 'create_transaction' });
        return internalError(corsHeaders, 'Failed to create transaction record');
      }
      transactionId_ = transaction.id;
      existingMetadata = (transaction.metadata || {}) as Record<string, unknown>;
    }

    logSecurityEvent('mpesa_stk_initiated', {
      transactionId: transactionId_, userId: user!.id, businessId, amount: chargeAmount,
    });

    // Initiate STK Push
    const baseUrl = isSandbox ? 'https://sandbox.safaricom.co.ke' : 'https://api.safaricom.co.ke';

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: txMode.type,
        Amount: chargeAmount,
        PartyA: normalizedPhone,
        PartyB: txMode.partyB(shortcode),
        PhoneNumber: normalizedPhone,
        CallBackURL: withCallbackToken(callbackUrl) ?? callbackUrlFor("mpesa-callback"),
        AccountReference: referenceCode,
        TransactionDesc: descriptionText,
      }),
    });

    const stkResult = await stkResponse.json();

    if (stkResult.ResponseCode === '0') {
      await adminClient.from('transactions').update({
        external_reference: stkResult.CheckoutRequestID,
        metadata: {
          ...existingMetadata,
          merchant_request_id: stkResult.MerchantRequestID,
          checkout_request_id: stkResult.CheckoutRequestID,
        },
      }).eq('id', transactionId_);

      return secureResponse(JSON.stringify({
        success: true,
        message: 'STK Push initiated successfully',
        transactionId: transactionId_,
        checkoutRequestId: stkResult.CheckoutRequestID,
        merchantRequestId: stkResult.MerchantRequestID,
      }), 200, corsHeaders);
    } else {
      await adminClient.from('transactions').update({
        status: 'failed',
        metadata: {
          ...existingMetadata,
          error: stkResult.errorMessage || stkResult.ResponseDescription,
          response_code: stkResult.ResponseCode,
        },
      }).eq('id', transactionId_);

      logError('mpesa-stk-push', new Error(stkResult.errorMessage || stkResult.ResponseDescription), { transactionId: transactionId_ });

      return secureResponse(JSON.stringify({
        success: false,
        error: stkResult.errorMessage || stkResult.ResponseDescription || 'STK Push failed',
        transactionId: transactionId_,
      }), 400, corsHeaders);
    }
  } catch (error) {
    logError('mpesa-stk-push', error, { fatal: true });
    return internalError(corsHeaders);
  }
});
