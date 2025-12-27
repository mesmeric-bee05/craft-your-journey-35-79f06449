import { MessageCircle, Instagram, Facebook, Twitter, Send, Video, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Channel {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  connected: boolean;
  messages: number;
  color: string;
}

const channels: Channel[] = [
  { name: 'WhatsApp', icon: MessageCircle, connected: true, messages: 45, color: 'text-green-500' },
  { name: 'Instagram', icon: Instagram, connected: true, messages: 23, color: 'text-pink-500' },
  { name: 'Facebook', icon: Facebook, connected: true, messages: 18, color: 'text-blue-600' },
  { name: 'Twitter/X', icon: Twitter, connected: false, messages: 0, color: 'text-sky-500' },
  { name: 'Telegram', icon: Send, connected: false, messages: 0, color: 'text-blue-400' },
  { name: 'TikTok', icon: Video, connected: false, messages: 0, color: 'text-foreground' },
];

export function ChannelStatus() {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-foreground">Channel Status</h3>
        <button className="text-sm text-primary hover:underline">Manage</button>
      </div>
      <div className="space-y-3">
        {channels.map((channel) => (
          <div
            key={channel.name}
            className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <channel.icon className={cn('w-5 h-5', channel.color)} />
              <span className="text-sm font-medium text-foreground">{channel.name}</span>
            </div>
            <div className="flex items-center gap-3">
              {channel.connected && channel.messages > 0 && (
                <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                  {channel.messages} new
                </span>
              )}
              {channel.connected ? (
                <CheckCircle className="w-4 h-4 text-success" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
