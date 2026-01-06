import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import type { Notification } from '@/hooks/useNotifications';
import { format, isToday, isYesterday } from 'date-fns';

function groupNotificationsByDate(notifications: Notification[]) {
  const groups: { label: string; notifications: Notification[] }[] = [];
  const grouped: Record<string, Notification[]> = {};

  notifications.forEach((notification) => {
    const date = new Date(notification.created_at);
    let label: string;

    if (isToday(date)) {
      label = 'Today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
    } else {
      label = format(date, 'MMMM d, yyyy');
    }

    if (!grouped[label]) {
      grouped[label] = [];
    }
    grouped[label].push(notification);
  });

  // Convert to array maintaining order
  const orderedLabels = ['Today', 'Yesterday'];
  orderedLabels.forEach(label => {
    if (grouped[label]) {
      groups.push({ label, notifications: grouped[label] });
      delete grouped[label];
    }
  });

  // Add remaining dates
  Object.entries(grouped).forEach(([label, notifs]) => {
    groups.push({ label, notifications: notifs });
  });

  return groups;
}

export function NotificationCenter() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    permission,
    requestPermission,
    markAsClicked,
    markAllAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    markAsClicked(notification.id);

    // Navigate based on notification type
    if (notification.data?.conversation_id) {
      navigate(`/inbox?conversation=${notification.data.conversation_id}`);
    }
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-accent text-accent-foreground text-xs font-bold rounded-full px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {permission !== 'granted' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={requestPermission}
                className="text-xs"
              >
                <BellOff className="w-4 h-4 mr-1" />
                Enable
              </Button>
            )}
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                disabled={isMarkingAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Inbox className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs">We'll notify you when something happens</p>
            </div>
          ) : (
            <div className="p-2">
              {groupedNotifications.map((group, groupIndex) => (
                <div key={group.label}>
                  {groupIndex > 0 && <Separator className="my-2" />}
                  <p className="text-xs font-medium text-muted-foreground px-3 py-2">
                    {group.label}
                  </p>
                  {group.notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
