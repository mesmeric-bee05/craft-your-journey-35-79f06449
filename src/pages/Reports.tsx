import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText, Download, BarChart3, Users, Wallet, MessageSquare,
  Calendar, TrendingUp, ArrowDownToLine, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { toast } from 'sonner';
import { subDays, format } from 'date-fns';

type ReportType = 'conversations' | 'customers' | 'revenue' | 'team';
type DateRange = '7d' | '30d' | '90d';

const reportConfigs: Record<ReportType, { title: string; description: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  conversations: { title: 'Conversation Report', description: 'Message volumes, resolution times, channel breakdown', icon: MessageSquare, color: 'text-primary' },
  customers: { title: 'Customer Report', description: 'Customer growth, segmentation, channel distribution', icon: Users, color: 'text-chart-5' },
  revenue: { title: 'Revenue Report', description: 'Transaction history, payment methods, daily revenue', icon: Wallet, color: 'text-success' },
  team: { title: 'Team Performance', description: 'Response times, resolution rates, agent activity', icon: TrendingUp, color: 'text-accent' },
};

export default function Reports() {
  const { business } = useBusiness();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [exporting, setExporting] = useState<ReportType | null>(null);

  const getDays = (range: DateRange) => range === '7d' ? 7 : range === '30d' ? 30 : 90;

  const exportCSV = async (type: ReportType) => {
    if (!business?.id) return;
    setExporting(type);

    try {
      const days = getDays(dateRange);
      const since = subDays(new Date(), days).toISOString();
      let csvContent = '';
      let filename = '';

      if (type === 'conversations') {
        const { data, error } = await supabase
          .from('conversations')
          .select('id, channel_type, status, priority, created_at, last_message_at, subject')
          .eq('business_id', business.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false });

        if (error) throw error;
        csvContent = 'ID,Channel,Status,Priority,Created,Last Message,Subject\n';
        csvContent += (data || []).map(r =>
          `${r.id},${r.channel_type},${r.status},${r.priority},${r.created_at},${r.last_message_at || ''},${(r.subject || '').replace(/,/g, ';')}`
        ).join('\n');
        filename = `conversations-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      } else if (type === 'customers') {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, email, phone, channel_type, created_at, last_contact_at, tags')
          .eq('business_id', business.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false });

        if (error) throw error;
        csvContent = 'ID,Name,Email,Phone,Channel,Created,Last Contact,Tags\n';
        csvContent += (data || []).map(r =>
          `${r.id},${(r.name || '').replace(/,/g, ';')},${r.email || ''},${r.phone || ''},${r.channel_type},${r.created_at},${r.last_contact_at || ''},${(r.tags || []).join(';')}`
        ).join('\n');
        filename = `customers-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      } else if (type === 'revenue') {
        const { data, error } = await (supabase as any)
          .from('transactions')
          .select('id, type, amount, status, payment_method, currency, created_at, description, reference')
          .eq('business_id', business.id)
          .gte('created_at', since)
          .order('created_at', { ascending: false });

        if (error) throw error;
        csvContent = 'ID,Type,Amount,Status,Method,Currency,Date,Description,Reference\n';
        csvContent += (data || []).map((r: any) =>
          `${r.id},${r.type},${r.amount},${r.status},${r.payment_method || ''},${r.currency},${r.created_at},${(r.description || '').replace(/,/g, ';')},${r.reference || ''}`
        ).join('\n');
        filename = `revenue-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      } else if (type === 'team') {
        const { data, error } = await supabase
          .from('business_members')
          .select('id, role, is_active, joined_at, user_id')
          .eq('business_id', business.id);

        if (error) throw error;
        csvContent = 'Member ID,Role,Active,Joined\n';
        csvContent += (data || []).map(r =>
          `${r.user_id},${r.role},${r.is_active},${r.joined_at || ''}`
        ).join('\n');
        filename = `team-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      }

      // Trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(`${reportConfigs[type].title} exported successfully`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">Export and analyze your business data</p>
          </div>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.entries(reportConfigs) as [ReportType, typeof reportConfigs[ReportType]][]).map(([type, config]) => (
            <Card key={type} className="shadow-soft border-border/50 hover:shadow-medium transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-3 rounded-xl bg-muted/50', config.color)}>
                      <config.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{config.title}</CardTitle>
                      <CardDescription>{config.description}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => exportCSV(type)}
                    disabled={exporting === type}
                    className="gap-2"
                    variant="outline"
                  >
                    {exporting === type ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ArrowDownToLine className="w-4 h-4" />
                    )}
                    Export CSV
                  </Button>
                  <Badge variant="secondary">
                    {dateRange === '7d' ? '7 days' : dateRange === '30d' ? '30 days' : '90 days'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
