import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { ChannelStatus } from '@/components/dashboard/ChannelStatus';
import { useAuth } from '@/hooks/useAuth';
import { MessageSquare, Users, Wallet, TrendingUp, Zap } from 'lucide-react';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
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

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your business today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Messages"
            value="1,284"
            change="+12.5% from last week"
            changeType="positive"
            icon={MessageSquare}
            iconColor="text-blue-500"
          />
          <StatCard
            title="Active Customers"
            value="432"
            change="+8.2% from last week"
            changeType="positive"
            icon={Users}
            iconColor="text-purple-500"
          />
          <StatCard
            title="Revenue (KES)"
            value="254,500"
            change="+23.1% from last week"
            changeType="positive"
            icon={Wallet}
            iconColor="text-green-500"
          />
          <StatCard
            title="Engagement Rate"
            value="4.8%"
            change="-0.3% from last week"
            changeType="negative"
            icon={TrendingUp}
            iconColor="text-orange-500"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <QuickActions />
            <RecentActivity />
          </div>
          <div>
            <ChannelStatus />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
