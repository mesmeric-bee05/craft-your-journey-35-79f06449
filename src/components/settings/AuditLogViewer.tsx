import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Shield, LogIn, KeyRound, UserX, FileDown, Settings2, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

const actionIcons: Record<string, React.ReactNode> = {
  login: <LogIn className="w-3.5 h-3.5" />,
  logout: <LogIn className="w-3.5 h-3.5 rotate-180" />,
  password_change: <KeyRound className="w-3.5 h-3.5" />,
  account_delete: <UserX className="w-3.5 h-3.5" />,
  data_export: <FileDown className="w-3.5 h-3.5" />,
  settings_update: <Settings2 className="w-3.5 h-3.5" />,
};

const actionColors: Record<string, string> = {
  login: 'bg-success/10 text-success',
  logout: 'bg-muted text-muted-foreground',
  password_change: 'bg-warning/10 text-warning',
  account_delete: 'bg-destructive/10 text-destructive',
  data_export: 'bg-primary/10 text-primary',
  settings_update: 'bg-accent/10 text-accent',
};

const columns: DataTableColumn<AuditLog>[] = [
  {
    key: 'action',
    header: 'Action',
    sortable: true,
    render: (row) => {
      const color = actionColors[row.action] || 'bg-muted text-muted-foreground';
      const icon = actionIcons[row.action] || <Eye className="w-3.5 h-3.5" />;
      return (
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${color}`}>{icon}</div>
          <span className="font-medium capitalize">{row.action.replace(/_/g, ' ')}</span>
        </div>
      );
    },
  },
  {
    key: 'entity_type',
    header: 'Resource',
    sortable: true,
    render: (row) => row.entity_type ? (
      <Badge variant="secondary" className="text-xs capitalize">{row.entity_type}</Badge>
    ) : <span className="text-muted-foreground text-xs">—</span>,
  },
  {
    key: 'created_at',
    header: 'When',
    sortable: true,
    render: (row) => (
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
      </span>
    ),
  },
  {
    key: 'ip_address',
    header: 'IP',
    render: (row) => (
      <span className="text-xs font-mono text-muted-foreground">{row.ip_address || '—'}</span>
    ),
  },
];

export function AuditLogViewer() {
  const { user } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, action, entity_type, entity_id, metadata, created_at, ip_address, user_agent')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as AuditLog[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Activity Log
        </CardTitle>
        <CardDescription>
          Recent account activity and security events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={logs}
          loading={isLoading}
          pageSize={8}
          searchable
          searchPlaceholder="Search actions..."
          searchKeys={['action', 'entity_type']}
          emptyTitle="No activity yet"
          emptyDescription="Your security events will appear here."
        />
      </CardContent>
    </Card>
  );
}
