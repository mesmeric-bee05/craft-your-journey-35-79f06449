import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SecurityRunStatus = 'pass' | 'warn' | 'fail';
export type SecurityCheckType = 'headers' | 'rpc_roles' | 'storage';

export interface SecurityRun {
  id: string;
  check_type: string;
  environment: string;
  status: SecurityRunStatus | string;
  summary: string | null;
  results: Record<string, unknown>;
  commit_sha: string | null;
  ran_by: string | null;
  created_at: string;
}

export interface SecurityRunsFilters {
  checkTypes: SecurityCheckType[];
  statuses: SecurityRunStatus[];
  environments: string[];
  rangeDays: 1 | 7 | 30 | 90 | 0; // 0 = all
  failingOnly: boolean;
  sortBy: 'created_at' | 'status';
  sortDir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export const defaultFilters: SecurityRunsFilters = {
  checkTypes: [],
  statuses: [],
  environments: [],
  rangeDays: 30,
  failingOnly: false,
  sortBy: 'created_at',
  sortDir: 'desc',
  page: 1,
  pageSize: 25,
};

export function useSecurityRuns(filters: SecurityRunsFilters) {
  const [rows, setRows] = useState<SecurityRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fromIso = useMemo(() => {
    if (!filters.rangeDays) return null;
    return new Date(Date.now() - filters.rangeDays * 86_400_000).toISOString();
  }, [filters.rangeDays]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = (filters.page - 1) * filters.pageSize;
      const to = from + filters.pageSize - 1;

      let query = supabase
        .from('security_check_runs')
        .select('*', { count: 'exact' });

      if (filters.checkTypes.length) query = query.in('check_type', filters.checkTypes);
      const effectiveStatuses = filters.failingOnly ? ['fail'] : filters.statuses;
      if (effectiveStatuses.length) query = query.in('status', effectiveStatuses);
      if (filters.environments.length) query = query.in('environment', filters.environments);
      if (fromIso) query = query.gte('created_at', fromIso);

      query = query.order(filters.sortBy, { ascending: filters.sortDir === 'asc' });
      if (filters.sortBy !== 'created_at') {
        query = query.order('created_at', { ascending: false });
      }
      query = query.range(from, to);

      const { data, count, error: err } = await query;
      if (err) throw err;
      setRows((data as SecurityRun[]) ?? []);
      setTotal(count ?? 0);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load runs');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, fromIso]);

  useEffect(() => { load(); }, [load]);

  return { rows, total, loading, error, reload: load };
}
