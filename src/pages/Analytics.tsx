import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SLAPerformanceChart } from '@/components/analytics/SLAPerformanceChart';
import { SLABreachTable } from '@/components/analytics/SLABreachTable';
import { CSATAnalytics } from '@/components/analytics/CSATAnalytics';
import { TeamPerformance } from '@/components/analytics/TeamPerformance';
import { ChannelAnalytics } from '@/components/analytics/ChannelAnalytics';
import { useSLATracking } from '@/hooks/useSLATracking';
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  BarChart3,
  Users,
  MessageSquare,
  Star
} from 'lucide-react';

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30');
  const { metrics, breachLogs, fetchMetrics, fetchBreachLogs } = useSLATracking();

  useEffect(() => {
    const days = parseInt(dateRange);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();
    fetchMetrics(startDate, endDate);
    fetchBreachLogs();
  }, [dateRange, fetchMetrics, fetchBreachLogs]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              Track performance metrics and customer satisfaction
            </p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* SLA Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg First Response</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.avg_first_response_minutes?.toFixed(0) || '0'} min
              </div>
              <p className="text-xs text-muted-foreground">
                Target: 60 min
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.avg_resolution_minutes 
                  ? metrics.avg_resolution_minutes > 60 
                    ? `${(metrics.avg_resolution_minutes / 60).toFixed(1)} hrs`
                    : `${metrics.avg_resolution_minutes.toFixed(0)} min`
                  : '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Target: 24 hrs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">First Response Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.first_response_compliance_rate?.toFixed(1) || '0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics?.first_response_breach_count || 0} breaches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics?.resolution_compliance_rate?.toFixed(1) || '0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics?.resolution_breach_count || 0} breaches
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sla" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sla" className="gap-2">
              <Clock className="h-4 w-4" />
              SLA Performance
            </TabsTrigger>
            <TabsTrigger value="csat" className="gap-2">
              <Star className="h-4 w-4" />
              CSAT
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="channels" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Channels
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sla" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SLAPerformanceChart dateRange={parseInt(dateRange)} />
              <Card>
                <CardHeader>
                  <CardTitle>SLA Summary</CardTitle>
                  <CardDescription>
                    Performance breakdown for the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Conversations</span>
                      <span className="font-medium">
                        {metrics?.total_conversations || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">First Response Breaches</span>
                      <span className="font-medium text-destructive">
                        {metrics?.first_response_breach_count || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Resolution Breaches</span>
                      <span className="font-medium text-destructive">
                        {metrics?.resolution_breach_count || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <SLABreachTable breaches={breachLogs} />
          </TabsContent>

          <TabsContent value="csat">
            <CSATAnalytics dateRange={parseInt(dateRange)} />
          </TabsContent>

          <TabsContent value="team">
            <TeamPerformance dateRange={parseInt(dateRange)} />
          </TabsContent>

          <TabsContent value="channels">
            <ChannelAnalytics dateRange={parseInt(dateRange)} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
