import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

interface DayData {
  date: string;
  messages: number;
  resolved: number;
  revenue: number;
}

export function useDashboardCharts() {
  const { business } = useBusiness();
  const [chartData, setChartData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChartData = useCallback(async () => {
    if (!business?.id) { setLoading(false); return; }

    try {
      setLoading(true);
      const days: DayData[] = [];

      // Build last 7 days
      for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStart = startOfDay(day).toISOString();
        const dayEnd = endOfDay(day).toISOString();

        const [msgRes, resolvedRes, txRes] = await Promise.all([
          supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', dayStart)
            .lte('created_at', dayEnd),
          supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', business.id)
            .eq('status', 'resolved')
            .gte('updated_at', dayStart)
            .lte('updated_at', dayEnd),
          (supabase as any)
            .from('transactions')
            .select('amount')
            .eq('business_id', business.id)
            .eq('status', 'completed')
            .gte('created_at', dayStart)
            .lte('created_at', dayEnd),
        ]);

        const revenue = (txRes.data || []).reduce((s: number, t: any) => s + Number(t.amount), 0);

        days.push({
          date: format(day, 'EEE'),
          messages: msgRes.count || 0,
          resolved: resolvedRes.count || 0,
          revenue,
        });
      }

      setChartData(days);
    } catch (err) {
      console.error('Chart data error:', err);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => { fetchChartData(); }, [fetchChartData]);

  return { chartData, loading, refetch: fetchChartData };
}
