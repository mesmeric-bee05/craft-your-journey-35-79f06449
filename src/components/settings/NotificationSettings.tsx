import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, Mail, MessageSquare, Smartphone, Volume2 } from 'lucide-react';
import { useUserSettings } from '@/hooks/useUserSettings';

export function NotificationSettings() {
  const { settings, loading, updateSettings } = useUserSettings();

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    if (settings) {
      updateSettings({ [key]: value });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(v) => handleToggle('email_notifications', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on your device
                </p>
              </div>
            </div>
            <Switch
              checked={settings.push_notifications}
              onCheckedChange={(v) => handleToggle('push_notifications', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important alerts via SMS
                </p>
              </div>
            </div>
            <Switch
              checked={settings.sms_notifications}
              onCheckedChange={(v) => handleToggle('sms_notifications', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>Notification Sound</Label>
                <p className="text-sm text-muted-foreground">
                  Play a sound for new notifications
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notification_sound}
              onCheckedChange={(v) => handleToggle('notification_sound', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Select which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>New Messages</Label>
              <p className="text-sm text-muted-foreground">
                When you receive a new customer message
              </p>
            </div>
            <Switch
              checked={settings.notify_new_message}
              onCheckedChange={(v) => handleToggle('notify_new_message', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>New Orders</Label>
              <p className="text-sm text-muted-foreground">
                When a new order is placed
              </p>
            </div>
            <Switch
              checked={settings.notify_new_order}
              onCheckedChange={(v) => handleToggle('notify_new_order', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Campaign Updates</Label>
              <p className="text-sm text-muted-foreground">
                Updates about your marketing campaigns
              </p>
            </div>
            <Switch
              checked={settings.notify_campaign_updates}
              onCheckedChange={(v) => handleToggle('notify_campaign_updates', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Team Activity</Label>
              <p className="text-sm text-muted-foreground">
                When team members take actions
              </p>
            </div>
            <Switch
              checked={settings.notify_team_activity}
              onCheckedChange={(v) => handleToggle('notify_team_activity', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label>Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">
                Receive a weekly summary of activity
              </p>
            </div>
            <Switch
              checked={settings.notify_weekly_digest}
              onCheckedChange={(v) => handleToggle('notify_weekly_digest', v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
