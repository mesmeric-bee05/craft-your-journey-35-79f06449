/**
 * Submits sitemap.xml to Google Search Console and records the result.
 * Triggerable by:
 *  - pg_cron (gsc-submit-sitemap-nightly)
 *  - the hardened trigger-cron-job proxy (admin-only)
 *
 * Failures are logged into cron_job_runs and dispatched via notifyCronFailure (Slack + email).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { gscFetch, SITE_URL, SITEMAP_URL, encodeSite } from "../_shared/gsc.ts";
import { notifyCronFailure } from "../_shared/cron-alerts.ts";

const JOB = "gsc-submit-sitemap";

async function logRun(svc: any, status: "success" | "failure" | "skipped", extra: Record<string, unknown>) {
  try {
    await svc.from("cron_job_runs").insert({
      job_name: JOB, finished_at: new Date().toISOString(), status, ...extra,
    });
  } catch (_) { /* ignore */ }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const start = Date.now();
  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // Verify our own files are reachable first
    const robots = await fetch(`${SITE_URL.replace(/\/$/, "")}/robots.txt`, { method: "HEAD" });
    const sitemap = await fetch(SITEMAP_URL, { method: "HEAD" });

    // (Re)submit sitemap to GSC
    const put = await gscFetch(`/webmasters/v3/sites/${encodeSite(SITE_URL)}/sitemaps/${encodeSite(SITEMAP_URL)}`, { method: "PUT" });
    // Fetch sitemap status detail
    const detail = await gscFetch(`/webmasters/v3/sites/${encodeSite(SITE_URL)}/sitemaps/${encodeSite(SITEMAP_URL)}`);

    const meta = {
      site: SITE_URL,
      sitemap: SITEMAP_URL,
      robots_status: robots.status,
      sitemap_status: sitemap.status,
      gsc_put_status: put.status,
      gsc_detail: detail.body,
    };

    if (!put.ok) throw new Error(`GSC sitemap submit failed: HTTP ${put.status} ${JSON.stringify(put.body).slice(0, 400)}`);

    await logRun(svc, "success", {
      duration_ms: Date.now() - start,
      rows_affected: 1,
      metadata: meta,
    });
    return new Response(JSON.stringify({ ok: true, ...meta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    const dur = Date.now() - start;
    const startedAt = new Date(start).toISOString();
    await logRun(svc, "failure", { duration_ms: dur, error_text: msg });
    await notifyCronFailure(svc, { jobName: JOB, status: "failure", errorText: msg, startedAt, durationMs: dur });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
