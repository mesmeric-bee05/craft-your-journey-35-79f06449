import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MessageCircle, Instagram, Facebook, Twitter, Send, Music2, Plus, Unplug } from 'lucide-react';
import { useConnectedChannels, ConnectedChannel } from '@/hooks/useConnectedChannels';
import { format } from 'date-fns';

const channelConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  whatsapp: { icon: <MessageCircle className="h-5 w-5" />, label: 'WhatsApp', color: 'bg-green-500' },
  instagram: { icon: <Instagram className="h-5 w-5" />, label: 'Instagram', color: 'bg-pink-500' },
  facebook: { icon: <Facebook className="h-5 w-5" />, label: 'Facebook', color: 'bg-blue-600' },
  twitter: { icon: <Twitter className="h-5 w-5" />, label: 'Twitter/X', color: 'bg-sky-500' },
  telegram: { icon: <Send className="h-5 w-5" />, label: 'Telegram', color: 'bg-blue-400' },
  tiktok: { icon: <Music2 className="h-5 w-5" />, label: 'TikTok', color: 'bg-black' },
};

const availableChannels = ['whatsapp', 'instagram', 'facebook', 'twitter', 'telegram', 'tiktok'];

export function ChannelSettings() {
  const { channels, loading, connectChannel, disconnectChannel, toggleChannelActive } = useConnectedChannels();
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const connectedTypes = channels.filter(c => c.is_connected).map(c => c.channel_type);
  const unconnectedChannels = availableChannels.filter(type => !connectedTypes.includes(type));

  const handleConnect = async (channelType: string) => {
    setConnecting(channelType);
    try {
      await connectChannel(channelType);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectingId) return;
    await disconnectChannel(disconnectingId);
    setDisconnectingId(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Channels</CardTitle>
          <CardDescription>
            Manage your connected social media and messaging channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {channels.filter(c => c.is_connected).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No channels connected yet</p>
              <p className="text-sm">Connect a channel below to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {channels.filter(c => c.is_connected).map((channel) => {
                const config = channelConfig[channel.channel_type];
                return (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg text-white ${config?.color || 'bg-gray-500'}`}>
                        {config?.icon || <MessageCircle className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {channel.channel_name || config?.label || channel.channel_type}
                          </span>
                          <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                            {channel.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        {channel.connected_at && (
                          <p className="text-sm text-muted-foreground">
                            Connected {format(new Date(channel.connected_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={channel.is_active}
                        onCheckedChange={(v) => toggleChannelActive(channel.id, v)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDisconnectingId(channel.id)}
                      >
                        <Unplug className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Channels */}
      {unconnectedChannels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Channels</CardTitle>
            <CardDescription>
              Connect additional channels to manage all your conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {unconnectedChannels.map((channelType) => {
                const config = channelConfig[channelType];
                return (
                  <Button
                    key={channelType}
                    variant="outline"
                    className="justify-start gap-3 h-auto py-3"
                    onClick={() => handleConnect(channelType)}
                    disabled={connecting === channelType}
                  >
                    <div className={`p-2 rounded-lg text-white ${config?.color || 'bg-gray-500'}`}>
                      {config?.icon || <MessageCircle className="h-5 w-5" />}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{config?.label || channelType}</div>
                      <div className="text-xs text-muted-foreground">
                        {connecting === channelType ? 'Connecting...' : 'Click to connect'}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 ml-auto" />
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disconnect Confirmation */}
      <AlertDialog open={!!disconnectingId} onOpenChange={() => setDisconnectingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Channel?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect the channel and you won't receive messages from it.
              You can reconnect it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect}>
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
