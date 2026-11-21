/**
 * Admin-only check of LIVE Safaricom Daraja credentials typed into the app.
 *
 * - Requires a signed-in admin; rate limited (10 checks/hour per admin).
 * - Asks Safaricom's live API for an OAuth token only — never charges anyone.
 * - Never stores, logs or returns the submitted values. Saving the keys is done
 *   through the project's secure key form, not this function.
 * - Every check is written to the audit log (outcome only, no values).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { getCorsHeaders, secureResponse } from "../_shared/security-headers.ts";

const Body = z.object({
  consumer_key: z.string().trim().min(10).max(200),
  consumer_secret: z.string().trim().min(10).max(200),
  passkey: z.string().trim().min(20).max(200),
  shortcode: z.string().trim().regex(/^\d{5,7}$/, "Paybill/Till number must be 5–7 digits"),
});

const SANDBOX_SHORTCODES = new Set(["174379", "600000", "600977", "600980"]);

Deno.serve(async (req) => {
  const cors = getCorsHeaders("*");
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return secureResponse(JSON.stringify({ error: "POST only" }), 405, cors);

  const admin = await requireAdmin(req);
  if (!admin) return secureResponse(JSON.stringify({ error: "Admins only" }), 403, cors);

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  });
  const { error: rl } = await userClient.rpc("check_and_record_admin_action", {
    p_action: "mpesa.validate_live_credentials", p_max_per_hour: 10,
  });
  if (rl) return secureResponse(JSON.stringify({ error: "Too many checks — try again in an hour." }), 429, cors);

  let raw: unknown;
  try { raw = await req.json(); } catch { raw = null; }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return secureResponse(JSON.stringify({ error: "invalid_input", fields: parsed.error.flatten().fieldErrors }), 400, cors);
  }
  const { consumer_key, consumer_secret, passkey, shortcode } = parsed.data;

  const checks = {
    shortcode_is_real: !SANDBOX_SHORTCODES.has(shortcode),
    passkey_looks_valid: /^[a-f0-9]{40,}$/i.test(passkey),
    live_credentials_accepted: false,
    safaricom_status: null as number | null,
  };
  try {
    const res = await fetch("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      headers: { Authorization: `Basic ${btoa(`${consumer_key}:${consumer_secret}`)}` },
    });
    checks.safaricom_status = res.status;
    const body = await res.json().catch(() => ({}));
    checks.live_credentials_accepted = res.ok && typeof body?.access_token === "string";
  } catch {
    checks.live_credentials_accepted = false;
  }
  const ready = checks.shortcode_is_real && checks.passkey_looks_valid && checks.live_credentials_accepted;

  await userClient.rpc("log_security_event", {
    p_action: "mpesa.validate_live_credentials",
    p_entity_type: "mpesa_credentials",
    p_entity_id: null,
    p_metadata: { ready, ...checks, shortcode_last3: shortcode.slice(-3) },
  });

  return secureResponse(JSON.stringify({ ready, ...checks, shortcode_last3: shortcode.slice(-3), checked_at: new Date().toISOString() }), 200, cors);
});
