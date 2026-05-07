import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAuditEvent } from '@/lib/auditLog';
import { Navigate } from 'react-router-dom';

interface SecurityRun {
  id: string;
  check_type: string;
  environment: string;
  status: 'pass' | 'fail' | 'warn' | string;
  summary: string | null;
  results: Record<string, unknown>;
  commit_sha: string | null;
  created_at: string;
}

const CHECK_TYPES: { type: string; label: string; description: string }[] = [
  { type: 'headers', label: 'Security headers', description: 'CSP, HSTS, X-Frame-Options on the deployed site.' },
  { type: 'rpc_roles', label: 'SECURITY DEFINER RPCs', description: 'Anon is denied; only intended roles can execute.' },
  { type: 'storage', label: 'Storage lockdown', description: 'business-assets is private; public listing disabled.' },
];

const STATUS_STYLES: Record<string, { icon: typeof ShieldCheck; tone: string; label: string }> = {
  pass: { icon: ShieldCheck, tone: 'text-emerald-500', label: 'Passing' },
  warn: { icon: ShieldAlert, tone: 'text-amber-500', label: 'Warning' },
  fail: { icon: ShieldX, tone: 'text-destructive', label: 'Failing' },
};

export default function SecurityDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [runs, setRuns] = useState<Record<string, SecurityRun | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user?.id) return;
      const { data } = await (supabase.rpc as any)('has_role', { _user_id: user.id, _role: 'admin' });
      if (!cancelled) setIsAdmin(Boolean(data));
    }
    check();
    return () => { cancelled = true; };
  }, [user?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const next: Record<string, SecurityRun | null> = {};
      for (const c of CHECK_TYPES) {
        const { data } = await (supabase as any)
          .from('security_check_runs')
          .select('*')
          .eq('check_type', c.type)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        next[c.type] = (data as SecurityRun) ?? null;
      }
      setRuns(next);
      logAuditEvent('security.dashboard.view', { entityType: 'security_dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  if (authLoading || isAdmin === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-primary" />
              Security operations
            </h1>
            <p className="text-muted-foreground mt-1">
              Latest results from automated security tests across the platform.
            </p>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {CHECK_TYPES.map((c) => {
            const run = runs[c.type] ?? null;
            const status = run?.status ?? 'unknown';
            const style = STATUS_STYLES[status] ?? { icon: ShieldAlert, tone: 'text-muted-foreground', label: 'No data' };
            const Icon = style.icon;
            return (
              <Card key={c.type} className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span>{c.label}</span>
                    <Icon className={`w-5 h-5 ${style.tone}`} />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={status === 'pass' ? 'default' : 'secondary'}>
                      {style.label}
                    </Badge>
                    {run?.environment && (
                      <span className="text-xs text-muted-foreground">{run.environment}</span>
                    )}
                  </div>
                  {run?.summary && (
                    <p className="text-sm text-foreground">{run.summary}</p>
                  )}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {run?.created_at && (
                      <div>Last run: {new Date(run.created_at).toLocaleString()}</div>
                    )}
                    {run?.commit_sha && (
                      <div className="font-mono">commit: {run.commit_sha.slice(0, 8)}</div>
                    )}
                    {!run && <div>No runs recorded yet.</div>}
                  </div>
                  {run?.results && Object.keys(run.results).length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View details
                      </summary>
                      <pre className="mt-2 p-2 rounded bg-muted/50 overflow-auto max-h-48">
{JSON.stringify(run.results, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">How to populate this dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              CI runs <code className="text-foreground">scripts/check-security-headers.ts</code>,
              <code className="text-foreground"> scripts/test-security-definer-roles.ts</code> and
              <code className="text-foreground"> scripts/test-storage-access.ts</code> on every push.
            </p>
            <p>
              Each script POSTs its results to the <code className="text-foreground">security_check_runs</code> table
              using the service role key, and the latest row per <code>check_type</code> is shown above.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
