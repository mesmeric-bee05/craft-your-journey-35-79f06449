import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, DollarSign, UserCheck, Sparkles, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  new_message: MessageSquare,
  assignment: UserCheck,
  status_change: Sparkles,
  payment: DollarSign,
};

const colorMap: Record<string, string> = {
  new_message: 'bg-primary/10 text-primary',
  assignment: 'bg-chart-5/10 text-chart-5',
  status_change: 'bg-accent/10 text-accent',
  payment: 'bg-success/10 text-success',
};

export function LiveActivityFeed() {
  const { business } = useBusiness();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;

    const fetchActivities = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, created_at, read_at')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(8);

      setActivities((data || []) as ActivityItem[]);
      setLoading(false);
    };

    fetchActivities();

    // Realtime subscription
    const channel = supabase
      .channel('dashboard-activity')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `business_id=eq.${business.id}`,
      }, (payload) => {
        setActivities(prev => [payload.new as ActivityItem, ...prev].slice(0, 8));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [business?.id]);

  return (
    <Card className="shadow-soft border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display">Live Activity</CardTitle>
          <Badge variant="outline" className="gap-1 text-xs">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const Icon = iconMap[activity.type] || Bell;
              return (
                <div
                  key={activity.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl transition-colors',
                    activity.read_at ? 'bg-muted/20' : 'bg-muted/40'
                  )}
                >
                  <div className={cn('p-2 rounded-lg flex-shrink-0', colorMap[activity.type] || 'bg-muted text-muted-foreground')}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.title}</p>
                    {activity.body && (
                      <p className="text-xs text-muted-foreground truncate">{activity.body}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
