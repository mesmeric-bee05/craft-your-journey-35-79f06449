/**
 * Admin-only: mint a META verification token, register the site, verify, and add to Search Console.
 * Workflow (call modes via { mode } in body):
 *   - "token"   : request a META verification token from Google
 *   - "verify"  : ask Google to verify the META tag (after it ships in index.html)
 *   - "add"     : add the verified site to Search Console + submit sitemap
 *   - "status"  : return current verification + site state
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://esm.sh/zod@3.23.8";
import { gscFetch, SITE_URL, SITEMAP_URL, encodeSite } from "../_shared/gsc.ts";
import { requireAdmin } from "../_shared/admin-auth.ts";

const Body = z.object({ mode: z.enum(["token", "verify", "add", "status"]) });

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function audit(userId: string, action: string, meta: Record<string, unknown>) {
  try {
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await svc.from("audit_logs").insert({ user_id: userId, action, entity_type: "gsc", metadata: meta });
  } catch (_) { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const admin = await requireAdmin(req);
  if (!admin) return json(401, { error: "unauthorized" });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return json(400, { error: "invalid body" });
  const { mode } = parsed.data;

  try {
    if (mode === "token") {
      const r = await gscFetch("/siteVerification/v1/token", {
        method: "POST",
        body: JSON.stringify({ site: { identifier: SITE_URL, type: "SITE" }, verificationMethod: "META" }),
      });
      await audit(admin.userId, "gsc.token_minted", { ip: admin.ip, ok: r.ok });
      return json(r.ok ? 200 : 502, { ok: r.ok, ...r.body });
    }

    if (mode === "verify") {
      const r = await gscFetch("/siteVerification/v1/webResource?verificationMethod=META", {
        method: "POST",
        body: JSON.stringify({ site: { identifier: SITE_URL, type: "SITE" } }),
      });
      await audit(admin.userId, "gsc.verify_attempt", { ip: admin.ip, status: r.status, body: r.body });
      return json(r.ok ? 200 : 502, { ok: r.ok, ...r.body });
    }

    if (mode === "add") {
      const add = await gscFetch(`/webmasters/v3/sites/${encodeSite(SITE_URL)}`, { method: "PUT" });
      const sm = await gscFetch(`/webmasters/v3/sites/${encodeSite(SITE_URL)}/sitemaps/${encodeSite(SITEMAP_URL)}`, { method: "PUT" });
      await audit(admin.userId, "gsc.site_added", { ip: admin.ip, addStatus: add.status, sitemapStatus: sm.status });
      return json(200, { ok: add.ok && sm.ok, addStatus: add.status, sitemapStatus: sm.status });
    }

    // status
    const sites = await gscFetch("/webmasters/v3/sites");
    const verResources = await gscFetch("/siteVerification/v1/webResource");
    return json(200, {
      site: SITE_URL,
      sites: sites.body,
      verifications: verResources.body,
    });
  } catch (e) {
    return json(500, { error: String((e as Error).message ?? e) });
  }
});
