/**
 * Periodic security re-scan.
 * Runs lightweight SQL-based checks against public schema + storage,
 * upserts results into public.security_findings, and alerts on net-new opens.
 *
 * Auth:
 *  - shared-secret header `x-rescan-secret` (when SECURITY_RESCAN_SECRET is set), OR
 *  - admin JWT (via has_role check) — used by /security/findings "Run now" button.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { notifyCronFailure } from "../_shared/cron-alerts.ts";

const JOB = "security-rescan-runner";
const SCANNER = "auto_rescan";

type Finding = {
  internal_id: string;
  name: string;
  description: string;
  severity: "info" | "warn" | "error";
  remediation_link?: string;
  metadata?: Record<string, unknown>;
};

// Tables that intentionally allow anon SELECT (public landing/marketing data).
const ANON_SELECT_ALLOWLIST = new Set<string>([
  "feedback_forms", "business_public_profiles", "faqs",
]);

async function gatherFindings(svc: any): Promise<Finding[]> {
  const findings: Finding[] = [];

  // 1. Tables in public without RLS
  const { data: noRls } = await svc.rpc("exec_sql_findings_no_rls" as any).catch(() => ({ data: null }));
  // Fall back to direct queries against information_schema/pg_catalog via lightweight RPC if available;
  // since we cannot create arbitrary helpers here, use pg_meta-style reads.
  const { data: tables } = await svc
    .from("pg_tables" as any)
    .select("tablename, rowsecurity")
    .eq("schemaname", "public")
    .catch(() => ({ data: null }));
  if (Array.isArray(tables)) {
    for (const t of tables as any[]) {
      if (t.rowsecurity === false) {
        findings.push({
          internal_id: `rls_disabled:${t.tablename}`,
          name: `RLS disabled on public.${t.tablename}`,
          description: "Row Level Security is not enabled on this table. Anonymous or authenticated users may read or write rows that should be restricted.",
          severity: "error",
          remediation_link: "https://supabase.com/docs/guides/auth/row-level-security",
        });
      }
    }
  }

  // 2. Public storage buckets (avatars is intentional; flag everything else)
  const { data: buckets } = await svc.storage.listBuckets();
  for (const b of buckets ?? []) {
    if (b.public && b.id !== "avatars") {
      findings.push({
        internal_id: `public_bucket:${b.id}`,
        name: `Storage bucket "${b.id}" is public`,
        description: "Public buckets are world-readable. Make sure no PII or business assets live here.",
        severity: "warn",
      });
    }
  }

  return findings;
}

async function logRun(svc: any, status: "success" | "failure", extra: Record<string, unknown>) {
  try {
    await svc.from("cron_job_runs").insert({
      job_name: JOB, finished_at: new Date().toISOString(), status, ...extra,
    });
  } catch (_) { /* ignore */ }
}

async function alertNewFindings(count: number) {
  const base = Deno.env.get("SUPABASE_URL");
  const secret = Deno.env.get("SECURITY_ALERT_SHARED_SECRET");
  if (!base || !secret || count === 0) return;
  try {
    await fetch(`${base}/functions/v1/security-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-alert-secret": secret },
      body: JSON.stringify({
        check_type: "rpc_roles",
        status: "fail",
        environment: Deno.env.get("SECURITY_CHECK_ENV") ?? "production",
        summary: `Security rescan detected ${count} new finding(s)`,
      }),
    });
  } catch (_) { /* ignore */ }
}

async function authorize(req: Request, svc: any): Promise<boolean> {
  const wantSecret = Deno.env.get("SECURITY_RESCAN_SECRET");
  if (wantSecret && req.headers.get("x-rescan-secret") === wantSecret) return true;

  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!jwt) return !wantSecret; // if no secret configured, allow cron

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: u } = await userClient.auth.getUser();
  if (!u?.user) return false;
  const { data: ok } = await svc.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  return Boolean(ok);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const start = Date.now();
  const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (!(await authorize(req, svc))) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const findings = await gatherFindings(svc);

    // Load all existing auto_rescan findings to diff.
    const { data: existing } = await svc
      .from("security_findings").select("id, finding_internal_id, status")
      .eq("scanner_name", SCANNER);
    const existingMap = new Map((existing ?? []).map((f: any) => [f.finding_internal_id, f]));

    let newCount = 0;
    for (const f of findings) {
      const prev = existingMap.get(f.internal_id);
      if (!prev) {
        await svc.from("security_findings").insert({
          scanner_name: SCANNER,
          finding_internal_id: f.internal_id,
          name: f.name,
          description: f.description,
          severity: f.severity,
          status: "open",
          remediation_link: f.remediation_link,
          metadata: f.metadata ?? {},
        });
        newCount++;
      } else if (prev.status === "fixed") {
        // Re-opened — flip back to open
        await svc.from("security_findings").update({
          status: "open", resolved_at: null, resolution_note: "Re-detected by auto_rescan",
        }).eq("id", prev.id);
        newCount++;
      }
      existingMap.delete(f.internal_id);
    }
    // Anything left in existingMap that was open → auto-resolve.
    for (const [, prev] of existingMap) {
      if ((prev as any).status === "open") {
        await svc.from("security_findings").update({
          status: "fixed",
          resolved_at: new Date().toISOString(),
          resolution_note: "Auto-resolved: no longer detected by auto_rescan",
        }).eq("id", (prev as any).id);
      }
    }

    await logRun(svc, "success", {
      rows_affected: findings.length,
      duration_ms: Date.now() - start,
      metadata: { new_findings: newCount, total_detected: findings.length },
    });
    await alertNewFindings(newCount);

    return new Response(JSON.stringify({ ok: true, total: findings.length, new: newCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = String((e as Error).message ?? e);
    await logRun(svc, "failure", { duration_ms: Date.now() - start, error_text: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
