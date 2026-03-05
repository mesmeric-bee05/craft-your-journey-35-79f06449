import { useState, useEffect } from 'react';
import { MessageSquare, DollarSign, UserCheck, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'message' | 'payment' | 'hire' | 'campaign';
  title: string;
  description: string;
  time: string;
}

const iconMap = {
  message: MessageSquare,
  payment: DollarSign,
  hire: UserCheck,
  campaign: Sparkles,
};

const colorMap = {
  message: 'bg-primary/10 text-primary',
  payment: 'bg-success/10 text-success',
  hire: 'bg-chart-5/10 text-chart-5',
  campaign: 'bg-accent/10 text-accent',
};

export function RecentActivity() {
  const { business } = useBusiness();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    async function fetchActivity() {
      setLoading(true);
      const results: Activity[] = [];

      // Fetch recent messages (last 5)
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, sender_type, created_at, conversation_id')
        .order('created_at', { ascending: false })
        .limit(3);

      messages?.forEach((m) => {
        results.push({
          id: m.id,
          type: 'message',
          title: m.sender_type === 'customer' ? 'New customer message' : 'Agent replied',
          description: m.content?.slice(0, 80) || 'No content',
          time: formatDistanceToNow(new Date(m.created_at), { addSuffix: true }),
        });
      });

      // Fetch recent transactions
      const { data: txns } = await supabase
        .from('transactions')
        .select('id, type, amount, currency, status, created_at, description')
        .eq('business_id', business!.id)
        .order('created_at', { ascending: false })
        .limit(2);

      txns?.forEach((t) => {
        results.push({
          id: t.id,
          type: 'payment',
          title: `${t.type === 'deposit' ? 'Payment received' : 'Payment sent'}`,
          description: `${t.currency || 'KES'} ${Number(t.amount).toLocaleString()} — ${t.description || t.status}`,
          time: formatDistanceToNow(new Date(t.created_at), { addSuffix: true }),
        });
      });

      // Fetch recent job applications
      const { data: apps } = await supabase
        .from('job_applications')
        .select('id, status, created_at, job_id')
        .order('created_at', { ascending: false })
        .limit(2);

      apps?.forEach((a) => {
        results.push({
          id: a.id,
          type: 'hire',
          title: 'New job application',
          description: `Application ${a.status} for posting`,
          time: formatDistanceToNow(new Date(a.created_at), { addSuffix: true }),
        });
      });

      // Sort by recency (approximate via the time string — ideally we'd keep timestamps)
      results.sort((a, b) => {
        // Simple sort: items with "seconds" or "minute" come first
        const getWeight = (t: string) => {
          if (t.includes('second')) return 0;
          if (t.includes('minute')) return 1;
          if (t.includes('hour')) return 2;
          return 3;
        };
        return getWeight(a.time) - getWeight(b.time);
      });

      setActivities(results.slice(0, 6));
      setLoading(false);
    }

    fetchActivity();
  }, [business?.id]);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50">
        <h3 className="text-lg font-display font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-foreground">Recent Activity</h3>
      </div>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No recent activity yet</p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = iconMap[activity.type];
            return (
              <div key={activity.id} className="flex items-start gap-4">
                <div className={cn('p-2 rounded-lg', colorMap[activity.type])}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
