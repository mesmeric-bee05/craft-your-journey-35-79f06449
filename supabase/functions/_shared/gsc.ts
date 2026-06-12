/**
 * Shared helpers for the Google Search Console connector gateway.
 * Routes everything through https://connector-gateway.lovable.dev/google_search_console
 * with auth headers: Bearer <LOVABLE_API_KEY> + X-Connection-Api-Key: <GSC_API_KEY>.
 */
export const GSC_GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";
export const SITE_URL = (Deno.env.get("PUBLIC_APP_URL") || "https://craft-your-journey-35.lovable.app").replace(/\/+$/, "") + "/";
export const SITEMAP_URL = `${SITE_URL.replace(/\/$/, "")}/sitemap.xml`;

export function gscHeaders(): Record<string, string> {
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  const gsc = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!lovable) throw new Error("LOVABLE_API_KEY is not configured");
  if (!gsc) throw new Error("GOOGLE_SEARCH_CONSOLE_API_KEY is not configured (link the Google Search Console connector)");
  return {
    Authorization: `Bearer ${lovable}`,
    "X-Connection-Api-Key": gsc,
    "Content-Type": "application/json",
  };
}

export async function gscFetch(path: string, init: RequestInit = {}): Promise<{ status: number; body: any; ok: boolean }> {
  const res = await fetch(`${GSC_GATEWAY}${path}`, {
    ...init,
    headers: { ...gscHeaders(), ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body: any;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text.slice(0, 500) }; }
  return { status: res.status, body, ok: res.ok };
}

export function encodeSite(siteUrl: string) {
  return encodeURIComponent(siteUrl);
}
