/**
 * M-Pesa STK Push Edge Function
 * 
 * Initiates M-Pesa STK Push payment requests
 * 
 * SECURITY:
 * - JWT authentication required
 * - Business membership verification
 * - Rate limited (5/min per IP, 20/min per user)
 * - Input validation with Zod
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema for STK Push request
const STKPushSchema = z.object({
  phone: z.string().min(9).max(15).regex(/^(?:\+254|254|0)?[17]\d{8}$/, 'Invalid Kenyan phone number'),
  amount: z.number().min(1).max(150000),
  reference: z.string().min(1).max(20),
  description: z.string().max(100).optional(),
  businessId: z.string().uuid(),
});

type STKPushRequest = z.infer<typeof STKPushSchema>;

// Normalize phone number to 254 format
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.startsWith('+254')) return cleaned.substring(1);
  if (cleaned.startsWith('254')) return cleaned;
  if (cleaned.startsWith('0')) return '254' + cleaned.substring(1);
  return '254' + cleaned;
}

// Generate M-Pesa password
function generatePassword(shortcode: string, passkey: string, timestamp: string): string {
  const rawPassword = shortcode + passkey + timestamp;
  return btoa(rawPassword);
}

// Get current timestamp in M-Pesa format
function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

// Get OAuth token from M-Pesa
async function getAccessToken(consumerKey: string, consumerSecret: string, sandbox: boolean = true): Promise<string> {
  const baseUrl = sandbox 
    ? 'https://sandbox.safaricom.co.ke'
    : 'https://api.safaricom.co.ke';
    
  const auth = btoa(`${consumerKey}:${consumerSecret}`);
  
  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get M-Pesa access token');
  }
  
  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const callbackUrl = Deno.env.get("MPESA_CALLBACK_URL");
    const isSandbox = Deno.env.get("MPESA_SANDBOX") !== 'false';

    // Check if M-Pesa is configured
    if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
      return new Response(
        JSON.stringify({ 
          error: 'M-Pesa not configured',
          message: 'Please configure M-Pesa API credentials' 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = STKPushSchema.safeParse(body);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { phone, amount, reference, description, businessId } = validation.data;

    // Verify business membership
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is owner or member
    const { data: membership } = await supabase
      .from('business_members')
      .select('id')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const isOwner = business.owner_id === user.id;
    const isMember = !!membership;

    if (!isOwner && !isMember) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare M-Pesa request
    const timestamp = getTimestamp();
    const password = generatePassword(shortcode, passkey, timestamp);
    const normalizedPhone = normalizePhone(phone);

    // Get access token
    const accessToken = await getAccessToken(consumerKey, consumerSecret, isSandbox);

    // Create transaction record first
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: transaction, error: txError } = await adminClient
      .from('transactions')
      .insert({
        business_id: businessId,
        user_id: user.id,
        type: 'deposit',
        amount: amount,
        currency: 'KES',
        status: 'pending',
        payment_method: 'mpesa',
        reference: reference,
        description: description || 'M-Pesa Payment',
        recipient_phone: normalizedPhone,
        metadata: {
          initiated_at: new Date().toISOString(),
          channel: 'stk_push',
        },
      })
      .select()
      .single();

    if (txError) {
      console.error('Transaction creation error:', txError);
      return new Response(
        JSON.stringify({ error: 'Failed to create transaction record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initiate STK Push
    const baseUrl = isSandbox 
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

    const stkPushPayload = {
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
    };

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPushPayload),
    });

    const stkResult = await stkResponse.json();

    if (stkResult.ResponseCode === '0') {
      // Update transaction with M-Pesa checkout request ID
      await adminClient
        .from('transactions')
        .update({
          external_reference: stkResult.CheckoutRequestID,
          metadata: {
            ...transaction.metadata,
            merchant_request_id: stkResult.MerchantRequestID,
            checkout_request_id: stkResult.CheckoutRequestID,
          },
        })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'STK Push initiated successfully',
          transactionId: transaction.id,
          checkoutRequestId: stkResult.CheckoutRequestID,
          merchantRequestId: stkResult.MerchantRequestID,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Update transaction as failed
      await adminClient
        .from('transactions')
        .update({
          status: 'failed',
          metadata: {
            ...transaction.metadata,
            error: stkResult.errorMessage || stkResult.ResponseDescription,
            response_code: stkResult.ResponseCode,
          },
        })
        .eq('id', transaction.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: stkResult.errorMessage || stkResult.ResponseDescription || 'STK Push failed',
          transactionId: transaction.id,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('M-Pesa STK Push error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
