import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, UserPlus, AtSign, RefreshCw, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/hooks/useNotifications';

const notificationConfig: Record<NotificationType, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  new_message: { icon: MessageSquare, color: 'text-blue-500 bg-blue-500/10' },
  assignment: { icon: UserPlus, color: 'text-purple-500 bg-purple-500/10' },
  mention: { icon: AtSign, color: 'text-orange-500 bg-orange-500/10' },
  status_change: { icon: RefreshCw, color: 'text-green-500 bg-green-500/10' },
  security_alert: { icon: ShieldAlert, color: 'text-red-500 bg-red-500/10' },
};

interface NotificationItemProps {
  notification: Notification;
  onClick: (notification: Notification) => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const config = notificationConfig[notification.type] || notificationConfig.new_message;
  const Icon = config.icon;
  const isUnread = !notification.read_at;

  return (
    <button
      onClick={() => onClick(notification)}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted',
        isUnread && 'bg-primary/5'
      )}
    >
      <div className={cn('p-2 rounded-lg shrink-0', config.color.split(' ')[1])}>
        <Icon className={cn('w-4 h-4', config.color.split(' ')[0])} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            'text-sm truncate',
            isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
          )}>
            {notification.title}
          </p>
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          )}
        </div>
        {notification.body && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {notification.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
    </button>
  );
}
