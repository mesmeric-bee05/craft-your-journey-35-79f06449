/**
 * Source verification for public payment provider callbacks (Safaricom Daraja).
 *
 * Daraja cannot send custom headers, so callbacks are authenticated by a secret
 * token embedded in the callback URL we register with Daraja
 * (`?token=<MPESA_CALLBACK_TOKEN>`), optionally combined with an IP allowlist
 * (`MPESA_ALLOWED_IPS`, comma separated prefixes).
 *
 * Fails closed: if no token is configured, callbacks are rejected so a
 * misconfiguration can never be exploited to forge payment results.
 */

function clientIps(req: Request): string[] {
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  return fwd.split(",").map((s) => s.trim()).filter(Boolean);
}

export function verifyCallbackSource(req: Request): { ok: boolean; reason?: string } {
  const expected = Deno.env.get("MPESA_CALLBACK_TOKEN");
  if (!expected) return { ok: false, reason: "callback_token_not_configured" };

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("token") ??
    req.headers.get("x-mpesa-callback-token") ??
    "";

  if (provided !== expected) return { ok: false, reason: "invalid_callback_token" };

  const allowlist = (Deno.env.get("MPESA_ALLOWED_IPS") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);

  if (allowlist.length > 0) {
    const ips = clientIps(req);
    const allowed = ips.some((ip) => allowlist.some((prefix) => ip.startsWith(prefix)));
    if (!allowed) return { ok: false, reason: "ip_not_allowlisted" };
  }

  return { ok: true };
}

/** Public callback URL for a function, carrying the shared secret token. */
export function callbackUrlFor(functionName: string): string {
  const base = Deno.env.get("SUPABASE_URL")!;
  const token = Deno.env.get("MPESA_CALLBACK_TOKEN") ?? "";
  return `${base}/functions/v1/${functionName}?token=${encodeURIComponent(token)}`;
}
