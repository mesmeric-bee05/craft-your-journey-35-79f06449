/**
 * Shared M-Pesa (Daraja) helpers used by STK-push style flows.
 *
 * Environment selection:
 * - MPESA_ENV = "production" selects the live Daraja API; anything else
 *   (including "sandbox" or unset) selects the sandbox.
 * - MPESA_SANDBOX = "false" is still honoured for backwards compatibility
 *   and always wins when set.
 */
export function mpesaEnv(): { isSandbox: boolean; baseUrl: string } {
  const sandboxFlag = Deno.env.get("MPESA_SANDBOX");
  const envName = (Deno.env.get("MPESA_ENV") ?? "").trim().toLowerCase();
  const isSandbox =
    sandboxFlag != null && sandboxFlag !== ""
      ? sandboxFlag !== "false"
      : envName !== "production";
  return {
    isSandbox,
    baseUrl: isSandbox ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke",
  };
}

export interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  baseUrl: string;
  isSandbox: boolean;
}

/** Returns the M-Pesa credentials or null when the environment is not configured. */
export function getMpesaConfig(): MpesaConfig | null {
  const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
  const passkey = Deno.env.get("MPESA_PASSKEY");
  const shortcode = Deno.env.get("MPESA_SHORTCODE");
  if (!consumerKey || !consumerSecret || !passkey || !shortcode) return null;
  const { isSandbox, baseUrl } = mpesaEnv();
  return { consumerKey, consumerSecret, passkey, shortcode, baseUrl, isSandbox };
}

export function normalizeKenyanPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+254")) return cleaned.substring(1);
  if (cleaned.startsWith("254")) return cleaned;
  if (cleaned.startsWith("0")) return "254" + cleaned.substring(1);
  return "254" + cleaned;
}

function stkTimestamp(): string {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
}

export async function getMpesaAccessToken(cfg: MpesaConfig): Promise<string> {
  const auth = btoa(`${cfg.consumerKey}:${cfg.consumerSecret}`);
  const res = await fetch(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`M-Pesa auth failed (${res.status})`);
  const data = await res.json();
  return data.access_token as string;
}

export interface StkPushArgs {
  phone: string;
  amount: number;
  reference: string;
  description?: string;
}

export interface StkPushResult {
  ok: boolean;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  customerMessage?: string;
  error?: string;
}

/** Initiates an STK push against Daraja using the shared credentials. */
export async function stkPush(cfg: MpesaConfig, args: StkPushArgs): Promise<StkPushResult> {
  const { callbackUrlFor, withCallbackToken } = await import("./callback-auth.ts");
  const timestamp = stkTimestamp();
  const password = btoa(`${cfg.shortcode}${cfg.passkey}${timestamp}`);
  const accessToken = await getMpesaAccessToken(cfg);
  const phone = normalizeKenyanPhone(args.phone);

  const callBackURL =
    withCallbackToken(Deno.env.get("MPESA_CALLBACK_URL") ?? "") ??
    callbackUrlFor("mpesa-callback");

  const res = await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: cfg.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(args.amount),
      PartyA: phone,
      PartyB: cfg.shortcode,
      PhoneNumber: phone,
      CallBackURL: callBackURL,
      AccountReference: args.reference.slice(0, 12),
      TransactionDesc: (args.description ?? "Payment").slice(0, 100),
    }),
  });

  const result = await res.json().catch(() => ({}) as Record<string, unknown>);

  if (result.ResponseCode === "0") {
    return {
      ok: true,
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      customerMessage: result.CustomerMessage,
    };
  }
  return {
    ok: false,
    error: result.errorMessage ?? result.ResponseDescription ?? `STK push failed (${res.status})`,
  };
}
