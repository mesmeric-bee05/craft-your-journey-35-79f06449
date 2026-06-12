import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SEO } from "@/components/seo/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, ShieldCheck, FileCheck2, ExternalLink, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useSEOAuditRuns, useRunSEOAudit, useResubmitSitemap, type SEOAuditRun } from "@/hooks/useSEOAudit";
import { useGSCStatus, useGSCAction } from "@/hooks/useGSCStatus";
import { SEOFindingsTable } from "@/components/admin/SEOFindingsTable";
import { CronRunsTimeline } from "@/components/admin/CronRunsTimeline";
import { toast } from "sonner";

export default function AdminSEO() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const runs = useSEOAuditRuns();
  const gsc = useGSCStatus();
  const gscActions = useGSCAction();
  const runAudit = useRunSEOAudit();
  const resubmit = useResubmitSitemap();
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any });
      setIsAdmin(Boolean(data));
    })();
  }, [user]);

  useEffect(() => {
    if (runs.data?.[0]?.id && !selectedRun) setSelectedRun(runs.data[0].id);
  }, [runs.data, selectedRun]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin === false) return <Navigate to="/dashboard" replace />;

  const lastRun: SEOAuditRun | undefined = runs.data?.[0];
  const verified = Array.isArray((gsc.data as any)?.verifications?.items) && (gsc.data as any).verifications.items.length > 0;
  const registered = Array.isArray((gsc.data as any)?.sites?.siteEntry) && (gsc.data as any).sites.siteEntry.length > 0;

  return (
    <DashboardLayout>
      <SEO title="SEO monitor — SmartReach" description="Indexing status, audit results, and Google Search Console controls." path="/admin/seo" noindex />
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Search className="h-7 w-7" />SEO Monitor</h1>
          <p className="text-muted-foreground">Google Search Console verification, sitemap submission, and per-route SEO health.</p>
        </div>

        {/* GSC verification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Google Search Console</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant={verified ? "secondary" : "outline"}>Verification: {verified ? "verified" : "pending"}</Badge>
              <Badge variant={registered ? "secondary" : "outline"}>Site registered: {registered ? "yes" : "no"}</Badge>
            </div>

            <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
              <li>Generate a verification token below.</li>
              <li>Paste it into <code className="text-xs bg-muted px-1 rounded">index.html</code> as the value of the <code className="text-xs bg-muted px-1 rounded">google-site-verification</code> meta tag, then publish.</li>
              <li>Click <b>Verify META tag</b> — Google fetches the live HTML to confirm.</li>
              <li>Click <b>Register site &amp; submit sitemap</b> to add the property and submit <code>/sitemap.xml</code>.</li>
            </ol>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={gscActions.token.isPending} onClick={async () => {
                const r: any = await gscActions.token.mutateAsync();
                if (r?.token) setToken(r.token);
              }}>
                <RefreshCw className={`h-3 w-3 mr-2 ${gscActions.token.isPending ? "animate-spin" : ""}`} /> Generate token
              </Button>
              <Button size="sm" variant="outline" disabled={gscActions.verify.isPending} onClick={() => gscActions.verify.mutate()}>
                Verify META tag
              </Button>
              <Button size="sm" variant="outline" disabled={gscActions.add.isPending} onClick={() => gscActions.add.mutate()}>
                Register site &amp; submit sitemap
              </Button>
            </div>

            {token && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                <div className="text-xs font-medium">Verification token (paste into <code>index.html</code>):</div>
                <pre className="text-xs font-mono break-all whitespace-pre-wrap">{token}</pre>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(token); toast.success("Copied"); }}>
                  <Copy className="h-3 w-3 mr-2" /> Copy
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sitemap */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Sitemap submission</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" asChild>
                <a href="/sitemap.xml" target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />View sitemap</a>
              </Button>
              <Button size="sm" variant="outline" disabled={resubmit.isPending} onClick={() => resubmit.mutate()}>
                <RefreshCw className={`h-3 w-3 mr-2 ${resubmit.isPending ? "animate-spin" : ""}`} />Resubmit now
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Automatically resubmitted nightly (03:15 UTC) and on demand. Submission outcomes appear in the runs timeline below as <code>gsc-submit-sitemap</code>.
          </CardContent>
        </Card>

        {/* Audit runs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent route audits</CardTitle>
            <Button size="sm" variant="outline" disabled={runAudit.isPending} onClick={() => runAudit.mutate()}>
              <RefreshCw className={`h-3 w-3 mr-2 ${runAudit.isPending ? "animate-spin" : ""}`} />Run audit now
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {runs.isLoading && [0, 1].map(i => <Skeleton key={i} className="h-10" />)}
            {runs.data?.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No audit runs yet — click "Run audit now".</p>}
            {(runs.data ?? []).map(r => (
              <button key={r.id}
                className={`w-full text-left p-3 rounded-md border transition-colors ${selectedRun === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                onClick={() => setSelectedRun(r.id)}>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "success" ? "secondary" : r.status === "failure" ? "destructive" : "outline"}>{r.status}</Badge>
                    <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.failing_routes}/{r.total_routes} failing · {r.total_findings} findings
                  </div>
                </div>
              </button>
            ))}
            {lastRun && (
              <p className="text-xs text-muted-foreground">
                Last run found <b>{lastRun.total_findings}</b> issue(s) across <b>{lastRun.total_routes}</b> route(s).
              </p>
            )}
          </CardContent>
        </Card>

        <SEOFindingsTable runId={selectedRun} />

        <CronRunsTimeline />
      </div>
    </DashboardLayout>
  );
}
