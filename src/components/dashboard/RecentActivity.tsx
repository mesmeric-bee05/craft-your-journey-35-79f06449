import { MessageSquare, DollarSign, UserCheck, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'message' | 'payment' | 'hire' | 'campaign';
  title: string;
  description: string;
  time: string;
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'message',
    title: 'New message from WhatsApp',
    description: 'Customer inquiry about product availability',
    time: '2 mins ago',
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment received',
    description: 'KES 15,000 from John Kamau via M-Pesa',
    time: '15 mins ago',
  },
  {
    id: '3',
    type: 'hire',
    title: 'New job application',
    description: 'Sarah Wanjiku applied for Delivery Driver',
    time: '1 hour ago',
  },
  {
    id: '4',
    type: 'campaign',
    title: 'Campaign completed',
    description: 'Instagram promo reached 5,200 users',
    time: '3 hours ago',
  },
];

const iconMap = {
  message: MessageSquare,
  payment: DollarSign,
  hire: UserCheck,
  campaign: Sparkles,
};

const colorMap = {
  message: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  payment: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  hire: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  campaign: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
};

export function RecentActivity() {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-foreground">Recent Activity</h3>
        <button className="text-sm text-primary hover:underline">View all</button>
      </div>
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
    </div>
  );
}
