/**
 * M-Pesa Callback Edge Function
 * 
 * Handles M-Pesa payment callbacks/webhooks
 * 
 * SECURITY:
 * - No JWT required (called by M-Pesa)
 * - Validates callback structure
 * - Updates transaction status securely
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MPesaCallbackItem {
  Name: string;
  Value: string | number;
}

interface MPesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: MPesaCallbackItem[];
      };
    };
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse callback body
    const callback: MPesaCallback = await req.json();
    
    console.log('[M-Pesa Callback] Received:', JSON.stringify(callback, null, 2));

    const { stkCallback } = callback.Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    if (!CheckoutRequestID) {
      return new Response(
        JSON.stringify({ ResultCode: 1, ResultDesc: 'Missing CheckoutRequestID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the transaction by checkout request ID
    const { data: transaction, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('external_reference', CheckoutRequestID)
      .single();

    if (findError || !transaction) {
      console.error('[M-Pesa Callback] Transaction not found:', CheckoutRequestID);
      return new Response(
        JSON.stringify({ ResultCode: 0, ResultDesc: 'Transaction not found but acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process based on result code
    if (ResultCode === 0) {
      // Payment successful
      const metadata: Record<string, unknown> = { 
        ...(transaction.metadata as Record<string, unknown> || {}),
        mpesa_result_code: ResultCode,
        mpesa_result_desc: ResultDesc,
        completed_at: new Date().toISOString(),
      };

      // Extract callback metadata
      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          switch (item.Name) {
            case 'MpesaReceiptNumber':
              metadata.mpesa_receipt = item.Value;
              break;
            case 'TransactionDate':
              metadata.mpesa_transaction_date = item.Value;
              break;
            case 'PhoneNumber':
              metadata.mpesa_phone = item.Value;
              break;
            case 'Amount':
              metadata.mpesa_amount = item.Value;
              break;
          }
        }
      }

      // Update transaction as completed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata,
        })
        .eq('id', transaction.id);

      if (updateError) {
        console.error('[M-Pesa Callback] Update error:', updateError);
      } else {
        console.log('[M-Pesa Callback] Transaction completed:', transaction.id);
        
        // Update wallet balance if applicable
        if (transaction.wallet_id) {
          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', transaction.wallet_id)
            .single();

          if (wallet) {
            await supabase
              .from('wallets')
              .update({
                balance: Number(wallet.balance) + Number(transaction.amount),
                updated_at: new Date().toISOString(),
              })
              .eq('id', transaction.wallet_id);
          }
        }

        // Create notification for user
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
      // Payment failed or cancelled
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
        console.error('[M-Pesa Callback] Failed update error:', updateError);
      } else {
        console.log('[M-Pesa Callback] Transaction failed:', transaction.id, ResultDesc);
      }
    }

    // Always acknowledge to M-Pesa
    return new Response(
      JSON.stringify({ ResultCode: 0, ResultDesc: 'Callback received successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[M-Pesa Callback] Error:', error);
    return new Response(
      JSON.stringify({ ResultCode: 1, ResultDesc: 'Internal error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
