/**
 * Capital Repayment Cron — daily STK push
 *
 * Iterates active advances, computes today's due as
 *   min(outstanding, revenue_share_pct% * yesterday's M-Pesa income)
 * and initiates an STK push per business, seeding a capital_repayments row.
 *
 * Called by pg_cron via the trigger-cron-job / net.http_post pattern.
 * Guarded by CRON_SECRET to prevent public invocation.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { logError, logSecurityEvent } from "../_shared/errors.ts";
import { notifyOpsFailure } from "../_shared/cron-alerts.ts";


function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+254")) return cleaned.substring(1);
  if (cleaned.startsWith("254")) return cleaned;
  if (cleaned.startsWith("0")) return "254" + cleaned.substring(1);
  return "254" + cleaned;
}

function ts(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
}

async function getAccessToken(key: string, sec: string, sandbox: boolean) {
  const base = sandbox ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke";
  const r = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${btoa(`${key}:${sec}`)}` },
  });
  if (!r.ok) throw new Error("Daraja OAuth failed");
  return (await r.json()).access_token as string;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders("*");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return secureResponse(JSON.stringify({ error: "Unauthorized" }), 401, corsHeaders);
  }

  const svc = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const key = Deno.env.get("MPESA_CONSUMER_KEY");
  const cs = Deno.env.get("MPESA_CONSUMER_SECRET");
  const passkey = Deno.env.get("MPESA_PASSKEY");
  const shortcode = Deno.env.get("MPESA_SHORTCODE");
  const sandbox = Deno.env.get("MPESA_ENV") !== "production";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  if (!key || !cs || !passkey || !shortcode) {
    return secureResponse(
      JSON.stringify({ error: "M-Pesa not configured" }), 503, corsHeaders
    );
  }

  const { data: advances, error } = await svc
    .from("capital_advances")
    .select("id, business_id, principal_kes, total_owed_kes, amount_repaid_kes, revenue_share_pct, businesses(owner_id, name)")
    .eq("status", "active")
    .eq("disbursement_status", "disbursed");

  if (error) return secureResponse(JSON.stringify({ error: error.message }), 500, corsHeaders);

  const results: any[] = [];
  const yesterday = new Date(Date.now() - 24 * 3600_000).toISOString();

  let token: string | null = null;
  try { token = await getAccessToken(key, cs, sandbox); }
  catch (e) {
    logError("capital-repayment-cron", e, { step: "oauth" });
    return secureResponse(JSON.stringify({ error: "Daraja auth failed" }), 502, corsHeaders);
  }

  for (const a of advances ?? []) {
    try {
      const outstanding = Number(a.total_owed_kes) - Number(a.amount_repaid_kes);
      if (outstanding <= 0) continue;

      const { data: incomes } = await svc.from("transactions")
        .select("amount")
        .eq("business_id", a.business_id)
        .eq("type", "income")
        .eq("status", "completed")
        .gte("completed_at", yesterday);

      const gmv = (incomes ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);
      const share = Math.floor(gmv * (Number(a.revenue_share_pct) / 100));
      const due = Math.min(outstanding, share);

      if (due < 10) { results.push({ id: a.id, skipped: "below_minimum", due }); continue; }

      const ownerId = (a.businesses as any)?.owner_id;
      const { data: prof } = await svc.from("profiles")
        .select("phone").eq("user_id", ownerId).single();
      const phone = prof?.phone?.toString().trim();
      if (!phone) { results.push({ id: a.id, skipped: "no_phone" }); continue; }
      const msisdn = normalizePhone(phone);

      const timestamp = ts();
      const password = btoa(shortcode + passkey + timestamp);
      const base = sandbox ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke";

      const stk = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: due,
          PartyA: msisdn,
          PartyB: shortcode,
          PhoneNumber: msisdn,
          CallBackURL: `${supabaseUrl}/functions/v1/mpesa-callback`,
          AccountReference: `CAP-${a.id.slice(0, 8)}`,
          TransactionDesc: "SmartReach Capital repayment",
        }),
      });
      const r = await stk.json();
      const ok = r.ResponseCode === "0";

      // Seed pending repayment row for callback to reconcile
      await svc.from("capital_repayments").insert({
        advance_id: a.id,
        amount_kes: due,
        source: "auto_mpesa",
        status: "pending",
        checkout_request_id: r.CheckoutRequestID ?? null,
        metadata: { stk: r, gmv_yesterday: gmv, msisdn },
      });

      // Also seed transaction row so mpesa-callback can attribute repayment
      if (ok && r.CheckoutRequestID) {
        await svc.from("transactions").insert({
          business_id: a.business_id,
          user_id: ownerId,
          type: "income",
          amount: due,
          currency: "KES",
          status: "pending",
          payment_method: "mpesa",
          reference: `CAP-${a.id.slice(0, 8)}`,
          description: "SmartReach Capital auto-repayment",
          recipient_phone: msisdn,
          external_reference: r.CheckoutRequestID,
          metadata: { reason: "capital_repayment", advance_id: a.id },
        });
      }

      results.push({ id: a.id, ok, due, checkout_request_id: r.CheckoutRequestID ?? null });
    } catch (e) {
      logError("capital-repayment-cron", e, { advanceId: a.id });
      results.push({ id: a.id, error: (e as Error).message });
    }
  }

  logSecurityEvent("capital_repayment_cron_run", { count: results.length });

  return secureResponse(JSON.stringify({ ok: true, processed: results.length, results }), 200, corsHeaders);
});
