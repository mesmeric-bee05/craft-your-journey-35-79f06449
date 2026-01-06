import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { useUserSettings } from '@/hooks/useUserSettings';
import { toast } from 'sonner';

export type NotificationType = 'new_message' | 'assignment' | 'mention' | 'status_change';

export interface Notification {
  id: string;
  business_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: {
    conversation_id?: string;
    message_id?: string;
    channel_type?: string;
    previous_assignee?: string | null;
    old_status?: string;
    new_status?: string;
  };
  read_at: string | null;
  clicked_at: string | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { settings } = useUserSettings();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Browser notifications are not supported');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('Notifications enabled');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (settings?.notification_sound) {
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      } catch (error) {
        // Ignore audio errors
      }
    }
  }, [settings?.notification_sound]);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: Notification) => {
    if (permission === 'granted' && settings?.push_notifications) {
      try {
        const browserNotif = new window.Notification(notification.title, {
          body: notification.body || undefined,
          icon: '/favicon.ico',
          tag: notification.id,
        });

        browserNotif.onclick = () => {
          window.focus();
          browserNotif.close();
        };

        playNotificationSound();
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }, [permission, settings?.push_notifications, playNotificationSound]);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id, business?.id],
    queryFn: async () => {
      if (!user?.id || !business?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('business_id', business.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Notification[];
    },
    enabled: !!user?.id && !!business?.id,
  });

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read_at).length;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark notification as clicked
  const markAsClickedMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read_at: new Date().toISOString(),
          clicked_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !business?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('business_id', business.id)
        .eq('user_id', user.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id || !business?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Update the query cache
          queryClient.setQueryData(
            ['notifications', user.id, business.id],
            (old: Notification[] = []) => [newNotification, ...old]
          );

          // Show browser notification
          showBrowserNotification(newNotification);

          // Show toast notification
          toast.info(newNotification.title, {
            description: newNotification.body || undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, business?.id, queryClient, showBrowserNotification]);

  return {
    notifications,
    unreadCount,
    isLoading,
    permission,
    requestPermission,
    markAsRead: markAsReadMutation.mutate,
    markAsClicked: markAsClickedMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}
