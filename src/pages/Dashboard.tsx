import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { ChannelStatus } from '@/components/dashboard/ChannelStatus';
import { ConversationTrendsChart } from '@/components/dashboard/ConversationTrendsChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { LiveActivityFeed } from '@/components/dashboard/LiveActivityFeed';
import { SmartReachScore } from '@/components/dashboard/SmartReachScore';
import { WellnessScoreCard } from '@/components/dashboard/WellnessScoreCard';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useDashboardCharts } from '@/hooks/useDashboardCharts';
import { MessageSquare, Users, Wallet, TrendingUp, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { stats, loading: statsLoading, refetch } = useDashboardStats();
  const { chartData, loading: chartsLoading, refetch: refetchCharts } = useDashboardCharts();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-glow">
          <Zap className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toLocaleString();
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const handleRefresh = () => {
    refetch();
    refetchCharts();
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your business today.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={statsLoading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-6 rounded-xl border bg-card">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard
                title="Total Messages"
                value={formatNumber(stats.totalMessages)}
                change={`${formatChange(stats.messagesChange)} from last week`}
                changeType={stats.messagesChange >= 0 ? 'positive' : 'negative'}
                icon={MessageSquare}
                iconColor="text-primary"
              />
              <StatCard
                title="Active Customers"
                value={formatNumber(stats.activeCustomers)}
                change={`${formatChange(stats.customersChange)} from last week`}
                changeType={stats.customersChange >= 0 ? 'positive' : 'negative'}
                icon={Users}
                iconColor="text-chart-5"
              />
              <StatCard
                title="Revenue (KES)"
                value={formatCurrency(stats.totalRevenue)}
                change={`${formatChange(stats.revenueChange)} from last week`}
                changeType={stats.revenueChange >= 0 ? 'positive' : 'negative'}
                icon={Wallet}
                iconColor="text-success"
              />
              <StatCard
                title="Engagement Rate"
                value={`${stats.engagementRate}%`}
                change={`${formatChange(stats.engagementChange)} from last week`}
                changeType={stats.engagementChange >= 0 ? 'positive' : 'negative'}
                icon={TrendingUp}
                iconColor="text-accent"
              />
            </>
          )}
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border bg-card/50">
            <p className="text-sm text-muted-foreground">Open Conversations</p>
            <p className="text-2xl font-bold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-12" /> : stats.openConversations}
            </p>
          </div>
          <div className="p-4 rounded-lg border bg-card/50">
            <p className="text-sm text-muted-foreground">Resolved Today</p>
            <p className="text-2xl font-bold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-12" /> : stats.resolvedToday}
            </p>
          </div>
          <div className="p-4 rounded-lg border bg-card/50">
            <p className="text-sm text-muted-foreground">Avg Response Time</p>
            <p className="text-2xl font-bold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-12" /> : `${Math.round(stats.avgResponseTime)}m`}
            </p>
          </div>
          <div className="p-4 rounded-lg border bg-card/50">
            <p className="text-sm text-muted-foreground">CSAT Score</p>
            <p className="text-2xl font-bold text-foreground">
              {statsLoading ? <Skeleton className="h-8 w-12" /> : stats.csatScore > 0 ? `${stats.csatScore.toFixed(1)}/5` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ConversationTrendsChart
            data={chartData.map(d => ({ date: d.date, messages: d.messages, resolved: d.resolved }))}
            loading={chartsLoading}
          />
          <RevenueChart
            data={chartData.map(d => ({ date: d.date, revenue: d.revenue }))}
            loading={chartsLoading}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <QuickActions />
            <LiveActivityFeed />
          </div>
          <div className="space-y-6">
            <SmartReachScore
              totalMessages={stats.totalMessages}
              activeCustomers={stats.activeCustomers}
              totalRevenue={stats.totalRevenue}
              csatScore={stats.csatScore}
              resolvedToday={stats.resolvedToday}
              openConversations={stats.openConversations}
              loading={statsLoading}
            />
            <ChannelStatus />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
