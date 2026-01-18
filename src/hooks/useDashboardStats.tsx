import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { subDays, startOfDay } from 'date-fns';

export interface DashboardStats {
  totalMessages: number;
  messagesChange: number;
  activeCustomers: number;
  customersChange: number;
  totalRevenue: number;
  revenueChange: number;
  engagementRate: number;
  engagementChange: number;
  openConversations: number;
  resolvedToday: number;
  avgResponseTime: number;
  csatScore: number;
}

interface UseDashboardStatsReturn {
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultStats: DashboardStats = {
  totalMessages: 0,
  messagesChange: 0,
  activeCustomers: 0,
  customersChange: 0,
  totalRevenue: 0,
  revenueChange: 0,
  engagementRate: 0,
  engagementChange: 0,
  openConversations: 0,
  resolvedToday: 0,
  avgResponseTime: 0,
  csatScore: 0,
};

export function useDashboardStats(): UseDashboardStatsReturn {
  const { business } = useBusiness();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const weekAgo = subDays(now, 7);
      const twoWeeksAgo = subDays(now, 14);
      const today = startOfDay(now);

      // Fetch all data in parallel
      const [
        messagesResult,
        previousMessagesResult,
        customersResult,
        previousCustomersResult,
        conversationsResult,
        resolvedTodayResult,
        slaMetricsResult,
        csatResult,
        transactionsResult,
        previousTransactionsResult,
      ] = await Promise.all([
        // Current week messages
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString()),
        // Previous week messages
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', twoWeeksAgo.toISOString())
          .lt('created_at', weekAgo.toISOString()),
        // Current week active customers
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .gte('last_contact_at', weekAgo.toISOString()),
        // Previous week active customers
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .gte('last_contact_at', twoWeeksAgo.toISOString())
          .lt('last_contact_at', weekAgo.toISOString()),
        // Open conversations
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .eq('status', 'open'),
        // Resolved today
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .eq('status', 'resolved')
          .gte('updated_at', today.toISOString()),
        // SLA metrics
        supabase.rpc('get_sla_metrics', {
          p_business_id: business.id,
          p_start_date: weekAgo.toISOString(),
          p_end_date: now.toISOString(),
        }),
        // CSAT metrics
        supabase.rpc('get_csat_metrics', {
          p_business_id: business.id,
          p_start_date: weekAgo.toISOString(),
          p_end_date: now.toISOString(),
        }),
        // Current week transactions
        (supabase as any)
          .from('transactions')
          .select('amount')
          .eq('business_id', business.id)
          .eq('status', 'completed')
          .in('type', ['deposit', 'payment'])
          .gte('created_at', weekAgo.toISOString()),
        // Previous week transactions
        (supabase as any)
          .from('transactions')
          .select('amount')
          .eq('business_id', business.id)
          .eq('status', 'completed')
          .in('type', ['deposit', 'payment'])
          .gte('created_at', twoWeeksAgo.toISOString())
          .lt('created_at', weekAgo.toISOString()),
      ]);

      const currentMessages = messagesResult.count || 0;
      const previousMessages = previousMessagesResult.count || 1; // Avoid division by zero
      const messagesChange = ((currentMessages - previousMessages) / previousMessages) * 100;

      const currentCustomers = customersResult.count || 0;
      const previousCustomers = previousCustomersResult.count || 1;
      const customersChange = ((currentCustomers - previousCustomers) / previousCustomers) * 100;

      const currentRevenue = (transactionsResult.data || []).reduce(
        (sum, t) => sum + Number(t.amount),
        0
      );
      const previousRevenue =
        (previousTransactionsResult.data || []).reduce(
          (sum, t) => sum + Number(t.amount),
          0
        ) || 1;
      const revenueChange = ((currentRevenue - previousRevenue) / previousRevenue) * 100;

      const slaData = slaMetricsResult.data?.[0] || {};
      const csatData = csatResult.data?.[0] || {};

      // Calculate engagement rate (messages responded / total messages)
      const engagementRate = currentMessages > 0 
        ? Math.min(((resolvedTodayResult.count || 0) / currentMessages) * 100, 100)
        : 0;

      setStats({
        totalMessages: currentMessages,
        messagesChange: Math.round(messagesChange * 10) / 10,
        activeCustomers: currentCustomers,
        customersChange: Math.round(customersChange * 10) / 10,
        totalRevenue: currentRevenue,
        revenueChange: Math.round(revenueChange * 10) / 10,
        engagementRate: Math.round(engagementRate * 10) / 10,
        engagementChange: 0, // Would need historical data to calculate
        openConversations: conversationsResult.count || 0,
        resolvedToday: resolvedTodayResult.count || 0,
        avgResponseTime: slaData.avg_first_response_minutes || 0,
        csatScore: csatData.avg_rating || 0,
      });
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
