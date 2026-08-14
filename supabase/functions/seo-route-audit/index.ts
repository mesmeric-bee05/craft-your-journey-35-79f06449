/**
 * SEO health-check that crawls a curated list of public routes and validates
 * title, description, canonical, OpenGraph, and JSON-LD presence/shape.
 * Results land in public.seo_audit_runs + public.seo_audit_findings.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { notifyCronFailure } from "../_shared/cron-alerts.ts";
import { isAuthorizedJobCall, unauthorizedJobResponse } from "../_shared/job-auth.ts";

const JOB = "seo-route-audit";
const BASE = (Deno.env.get("PUBLIC_APP_URL") || "https://craft-your-journey-35.lovable.app").replace(/\/+$/, "");

type Finding = { route: string; check_name: string; severity: "info" | "warn" | "error"; message: string; evidence?: Record<string, unknown> };

const STATIC_ROUTES = ["/", "/auth", "/reset-password", "/resources/best-times-to-post-kenya"];

function pickMeta(html: string, key: "name" | "property", value: string): string | null {
  const re = new RegExp(`<meta\\s+[^>]*${key}=["']${value.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  if (!tag) return null;
  return tag.match(/content=["']([^"']*)["']/i)?.[1] ?? null;
}

function pickTitle(html: string): string | null {
  return html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? null;
}

function pickCanonicals(html: string): string[] {
  const tags = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi) ?? [];
  return tags.map(t => t.match(/href=["']([^"']*)["']/i)?.[1]).filter(Boolean) as string[];
}

function pickJsonLd(html: string): { count: number; invalid: number } {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  let invalid = 0;
  for (const b of blocks) {
    const body = b.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "").trim();
    try { JSON.parse(body); } catch { invalid++; }
  }
  return { count: blocks.length, invalid };
}

async function auditRoute(route: string): Promise<Finding[]> {
  const url = `${BASE}${route}`;
  const findings: Finding[] = [];
  let html = "";
  try {
    const res = await fetch(url, { headers: { "User-Agent": "SmartReach-SEO-Audit/1.0" } });
    if (!res.ok) {
      findings.push({ route, check_name: "http_status", severity: "error", message: `HTTP ${res.status}`, evidence: { status: res.status } });
      return findings;
    }
    html = await res.text();
  } catch (e) {
    findings.push({ route, check_name: "fetch_error", severity: "error", message: String((e as Error).message ?? e) });
    return findings;
  }

  const title = pickTitle(html);
  if (!title) findings.push({ route, check_name: "title_missing", severity: "error", message: "<title> tag missing" });
  else if (title.length > 60) findings.push({ route, check_name: "title_too_long", severity: "warn", message: `Title ${title.length} chars (>60)`, evidence: { title } });
  else if (title.length < 10) findings.push({ route, check_name: "title_too_short", severity: "warn", message: `Title only ${title.length} chars`, evidence: { title } });

  const desc = pickMeta(html, "name", "description");
  if (!desc) findings.push({ route, check_name: "description_missing", severity: "error", message: "meta description missing" });
  else if (desc.length > 160) findings.push({ route, check_name: "description_too_long", severity: "warn", message: `Description ${desc.length} chars (>160)` });
  else if (desc.length < 50) findings.push({ route, check_name: "description_too_short", severity: "warn", message: `Description only ${desc.length} chars` });

  const canonicals = pickCanonicals(html);
  if (canonicals.length === 0) findings.push({ route, check_name: "canonical_missing", severity: "error", message: "<link rel=canonical> missing" });
  else if (canonicals.length > 1) findings.push({ route, check_name: "canonical_duplicate", severity: "error", message: `${canonicals.length} canonical tags found`, evidence: { canonicals } });
  else {
    const c = canonicals[0];
    if (!c.startsWith("http")) findings.push({ route, check_name: "canonical_relative", severity: "warn", message: "Canonical is relative", evidence: { canonical: c } });
    if (c.startsWith("http") && !c.includes(BASE.replace(/^https?:\/\//, ""))) {
      findings.push({ route, check_name: "canonical_cross_domain", severity: "warn", message: "Canonical points to a different host", evidence: { canonical: c, expected_host: BASE } });
    }
  }

  for (const k of ["og:title", "og:description", "og:url", "og:type"] as const) {
    const v = pickMeta(html, "property", k);
    if (!v) findings.push({ route, check_name: `og_missing:${k}`, severity: "warn", message: `OpenGraph ${k} missing` });
  }

  const jsonLd = pickJsonLd(html);
  if (jsonLd.count === 0) findings.push({ route, check_name: "jsonld_missing", severity: "info", message: "No application/ld+json blocks" });
  if (jsonLd.invalid > 0) findings.push({ route, check_name: "jsonld_invalid", severity: "error", message: `${jsonLd.invalid} invalid JSON-LD block(s)`, evidence: { invalid: jsonLd.invalid, total: jsonLd.count } });

  return findings;
}

async function logCron(svc: any, status: "success" | "failure", extra: Record<string, unknown>) {
  try {
    await svc.from("cron_job_runs").insert({ job_name: JOB, finished_at: new Date().toISOString(), status, ...extra });
  } catch (_) { /* ignore */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const start = Date.now();
  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (!(await isAuthorizedJobCall(svc, req, JOB))) {
    return unauthorizedJobResponse(corsHeaders);
  }

  const { data: runRow, error: runErr } = await svc.from("seo_audit_runs").insert({ status: "running" }).select("id").single();
  if (runErr) {
    return new Response(JSON.stringify({ error: runErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const runId = runRow.id as string;

  try {
    // Build dynamic routes from published public profiles + feedback forms
    const dynamic: string[] = [];
    try {
      const { data: profiles } = await svc.from("business_public_profiles" as never).select("slug").eq("is_published", true).limit(50);
      for (const p of (profiles ?? []) as any[]) if (p.slug) dynamic.push(`/biz/${p.slug}`);
    } catch (_) {}
    try {
      const { data: forms } = await svc.from("feedback_forms" as never).select("slug").eq("is_active", true).limit(50);
      for (const f of (forms ?? []) as any[]) if (f.slug) dynamic.push(`/feedback/${f.slug}`);
    } catch (_) {}

    const routes = Array.from(new Set([...STATIC_ROUTES, ...dynamic]));
    const allFindings: Finding[] = [];
    const failingRoutes = new Set<string>();

    // Run in batches of 4 to avoid overwhelming the server
    for (let i = 0; i < routes.length; i += 4) {
      const batch = routes.slice(i, i + 4);
      const results = await Promise.all(batch.map(auditRoute));
      for (let j = 0; j < batch.length; j++) {
        const fs = results[j];
        for (const f of fs) {
          allFindings.push(f);
          if (f.severity !== "info") failingRoutes.add(f.route);
        }
      }
    }

    if (allFindings.length) {
      await svc.from("seo_audit_findings").insert(
        allFindings.map(f => ({ run_id: runId, route: f.route, check_name: f.check_name, severity: f.severity, message: f.message, evidence: f.evidence ?? {} }))
      );
    }

    await svc.from("seo_audit_runs").update({
      finished_at: new Date().toISOString(),
      status: "success",
      total_routes: routes.length,
      failing_routes: failingRoutes.size,
      total_findings: allFindings.length,
      metadata: { base: BASE, routes },
    }).eq("id", runId);

    await logCron(svc, "success", {
      duration_ms: Date.now() - start,
      rows_affected: allFindings.length,
      metadata: { run_id: runId, total_routes: routes.length, failing_routes: failingRoutes.size },
    });

    return new Response(JSON.stringify({ ok: true, runId, total_routes: routes.length, failing_routes: failingRoutes.size, total_findings: allFindings.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    const dur = Date.now() - start;
    const startedAt = new Date(start).toISOString();
    await svc.from("seo_audit_runs").update({ status: "failure", finished_at: new Date().toISOString(), metadata: { error: msg } }).eq("id", runId);
    await logCron(svc, "failure", { duration_ms: dur, error_text: msg, metadata: { run_id: runId } });
    await notifyCronFailure(svc, { jobName: JOB, status: "failure", errorText: msg, startedAt, durationMs: dur });
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
