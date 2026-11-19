/**
 * Admin-only M-Pesa readiness check.
 *
 * Reports whether the Daraja credentials are present, whether they point at
 * the live or sandbox API, and whether Safaricom accepts them (OAuth token
 * request only — this never charges anyone). Secret values are never returned.
 */
import { requireAdmin } from "../_shared/admin-auth.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";
import { getMpesaConfig, mpesaEnv, mpesaTransactionMode } from "../_shared/mpesa-stk.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders("*");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = await requireAdmin(req);
  if (!admin) {
    return secureResponse(JSON.stringify({ error: { code: "FORBIDDEN", message: "Admins only" } }), 403, corsHeaders);
  }

  const cfg = getMpesaConfig();
  const { isSandbox } = mpesaEnv();
  const txMode = mpesaTransactionMode();
  const status: Record<string, unknown> = {
    configured: !!cfg,
    mode: isSandbox ? "test" : "live",
    payment_type: txMode.type === "CustomerBuyGoodsOnline" ? "till" : "paybill",
    callback_token_set: !!Deno.env.get("MPESA_CALLBACK_TOKEN"),
    receiver_last3: cfg ? txMode.partyB(cfg.shortcode).slice(-3) : null,
    credentials_accepted: null as boolean | null,
    safaricom_status: null as number | null,
    checked_at: new Date().toISOString(),
  };

  if (cfg) {
    try {
      const auth = btoa(`${cfg.consumerKey}:${cfg.consumerSecret}`);
      const res = await fetch(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      status.safaricom_status = res.status;
      const body = await res.json().catch(() => ({}));
      status.credentials_accepted = res.ok && typeof body?.access_token === "string";
    } catch {
      status.credentials_accepted = false;
    }
  }

  return secureResponse(JSON.stringify(status), 200, corsHeaders);
});
