import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Loader2, ArrowUpDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logAuditEvent } from '@/lib/auditLog';
import { Navigate } from 'react-router-dom';
import {
  defaultFilters,
  useSecurityRuns,
  type SecurityCheckType,
  type SecurityRun,
  type SecurityRunStatus,
  type SecurityRunsFilters,
} from '@/hooks/useSecurityRuns';

const CHECK_TYPES: { type: SecurityCheckType; label: string; description: string }[] = [
  { type: 'headers', label: 'Security headers', description: 'CSP, HSTS, X-Frame-Options on the deployed site.' },
  { type: 'rpc_roles', label: 'SECURITY DEFINER RPCs', description: 'Anon is denied; only intended roles can execute.' },
  { type: 'storage', label: 'Storage lockdown', description: 'business-assets is private; public listing disabled.' },
];

const STATUS_STYLES: Record<string, { icon: typeof ShieldCheck; tone: string; label: string }> = {
  pass: { icon: ShieldCheck, tone: 'text-emerald-500', label: 'Passing' },
  warn: { icon: ShieldAlert, tone: 'text-amber-500', label: 'Warning' },
  fail: { icon: ShieldX, tone: 'text-destructive', label: 'Failing' },
};

function StatusBadge({ status }: { status: string }) {
  const variant = status === 'pass' ? 'default' : status === 'fail' ? 'destructive' : 'secondary';
  return <Badge variant={variant as any}>{STATUS_STYLES[status]?.label ?? status}</Badge>;
}

export default function SecurityDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [latest, setLatest] = useState<Record<string, SecurityRun | null>>({});
  const [latestLoading, setLatestLoading] = useState(true);
  const [filters, setFilters] = useState<SecurityRunsFilters>(defaultFilters);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user?.id) return;
      const { data } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!cancelled) setIsAdmin(Boolean(data));
    }
    check();
    return () => { cancelled = true; };
  }, [user?.id]);

  const loadLatest = async () => {
    setLatestLoading(true);
    try {
      const next: Record<string, SecurityRun | null> = {};
      for (const c of CHECK_TYPES) {
        const { data } = await supabase
          .from('security_check_runs')
          .select('*')
          .eq('check_type', c.type)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        next[c.type] = (data as SecurityRun) ?? null;
      }
      setLatest(next);
      logAuditEvent('security.dashboard.view', { entityType: 'security_dashboard' });
    } finally {
      setLatestLoading(false);
    }
  };

  useEffect(() => { if (isAdmin) loadLatest(); }, [isAdmin]);

  const { rows, total, loading, reload } = useSecurityRuns(filters);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const update = (patch: Partial<SecurityRunsFilters>) =>
    setFilters((f) => ({ ...f, page: 1, ...patch }));

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
              Latest results and full history from automated security tests.
            </p>
          </div>
          <Button variant="outline" onClick={() => { loadLatest(); reload(); }} disabled={loading || latestLoading}>
            {(loading || latestLoading) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Refresh
          </Button>
        </div>

        {/* Latest status cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {CHECK_TYPES.map((c) => {
            const run = latest[c.type] ?? null;
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
                <CardContent className="space-y-2">
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    {run?.environment && (
                      <span className="text-xs text-muted-foreground">{run.environment}</span>
                    )}
                  </div>
                  {run?.summary && <p className="text-sm text-foreground line-clamp-2">{run.summary}</p>}
                  <div className="text-xs text-muted-foreground">
                    {run?.created_at ? `Last run: ${new Date(run.created_at).toLocaleString()}` : 'No runs recorded yet.'}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Check</Label>
                <Select
                  value={filters.checkTypes[0] ?? 'all'}
                  onValueChange={(v) => update({ checkTypes: v === 'all' ? [] : [v as SecurityCheckType] })}
                >
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All checks</SelectItem>
                    {CHECK_TYPES.map((c) => (
                      <SelectItem key={c.type} value={c.type}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={filters.statuses[0] ?? 'all'}
                  onValueChange={(v) => update({ statuses: v === 'all' ? [] : [v as SecurityRunStatus] })}
                  disabled={filters.failingOnly}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pass">Passing</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="fail">Failing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Environment</Label>
                <Select
                  value={filters.environments[0] ?? 'all'}
                  onValueChange={(v) => update({ environments: v === 'all' ? [] : [v] })}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Range</Label>
                <Select
                  value={String(filters.rangeDays)}
                  onValueChange={(v) => update({ rangeDays: Number(v) as SecurityRunsFilters['rangeDays'] })}
                >
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Last 24h</SelectItem>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="0">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Sort</Label>
                <Select
                  value={`${filters.sortBy}:${filters.sortDir}`}
                  onValueChange={(v) => {
                    const [sortBy, sortDir] = v.split(':') as [SecurityRunsFilters['sortBy'], SecurityRunsFilters['sortDir']];
                    update({ sortBy, sortDir });
                  }}
                >
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at:desc">Newest first</SelectItem>
                    <SelectItem value="created_at:asc">Oldest first</SelectItem>
                    <SelectItem value="status:asc">Failing first</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pb-1.5 ml-auto">
                <Switch
                  id="failing-only"
                  checked={filters.failingOnly}
                  onCheckedChange={(checked) => update({ failingOnly: checked })}
                />
                <Label htmlFor="failing-only" className="text-sm">Failing only</Label>
              </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Check</TableHead>
                    <TableHead>Env</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Commit</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-4 h-4 animate-spin inline" />
                    </TableCell></TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      No runs match the current filters.
                    </TableCell></TableRow>
                  ) : rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(r.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {CHECK_TYPES.find((c) => c.type === r.check_type)?.label ?? r.check_type}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.environment}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {r.commit_sha ? r.commit_sha.slice(0, 8) : '—'}
                      </TableCell>
                      <TableCell className="text-xs max-w-md truncate" title={r.summary ?? ''}>
                        {r.summary ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {total === 0
                  ? 'No results'
                  : `Showing ${(filters.page - 1) * filters.pageSize + 1}–${Math.min(filters.page * filters.pageSize, total)} of ${total}`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  disabled={filters.page <= 1 || loading}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >Previous</Button>
                <span className="text-xs text-muted-foreground">
                  Page {filters.page} / {totalPages}
                </span>
                <Button
                  variant="outline" size="sm"
                  disabled={filters.page >= totalPages || loading}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
