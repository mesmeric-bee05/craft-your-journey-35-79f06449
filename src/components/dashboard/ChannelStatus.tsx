import { useState, useEffect } from 'react';
import { MessageCircle, Instagram, Facebook, Twitter, Send, Video, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useNavigate } from 'react-router-dom';

interface ChannelInfo {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  type: string;
}

const channelMeta: ChannelInfo[] = [
  { name: 'WhatsApp', icon: MessageCircle, color: 'text-green-500', type: 'whatsapp' },
  { name: 'Instagram', icon: Instagram, color: 'text-pink-500', type: 'instagram' },
  { name: 'Facebook', icon: Facebook, color: 'text-blue-600', type: 'facebook' },
  { name: 'Twitter/X', icon: Twitter, color: 'text-sky-500', type: 'twitter' },
  { name: 'Telegram', icon: Send, color: 'text-blue-400', type: 'telegram' },
  { name: 'TikTok', icon: Video, color: 'text-foreground', type: 'tiktok' },
];

interface ChannelData {
  type: string;
  connected: boolean;
  unreadCount: number;
}

export function ChannelStatus() {
  const { business } = useBusiness();
  const navigate = useNavigate();
  const [channelData, setChannelData] = useState<ChannelData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;

    const fetchChannels = async () => {
      // Fetch connected channels
      const { data: channels } = await supabase
        .rpc('get_safe_channels', { p_business_id: business.id });

      // Fetch unread counts per channel type
      const { data: unreadCounts } = await supabase
        .from('conversations')
        .select('channel_type, unread_count')
        .eq('business_id', business.id)
        .eq('status', 'open')
        .gt('unread_count', 0);

      const unreadMap: Record<string, number> = {};
      (unreadCounts || []).forEach((c: any) => {
        unreadMap[c.channel_type] = (unreadMap[c.channel_type] || 0) + (c.unread_count || 0);
      });

      const connectedTypes = new Set((channels || []).map((c: any) => c.channel_type));

      setChannelData(
        channelMeta.map(ch => ({
          type: ch.type,
          connected: connectedTypes.has(ch.type),
          unreadCount: unreadMap[ch.type] || 0,
        }))
      );
      setLoading(false);
    };

    fetchChannels();
  }, [business?.id]);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-display font-semibold text-foreground">Channel Status</h3>
        <button
          onClick={() => navigate('/settings')}
          className="text-sm text-primary hover:underline"
        >
          Manage
        </button>
      </div>
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          channelMeta.map((channel) => {
            const data = channelData.find(d => d.type === channel.type);
            return (
              <div
                key={channel.name}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <channel.icon className={cn('w-5 h-5', channel.color)} />
                  <span className="text-sm font-medium text-foreground">{channel.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {data?.connected && data.unreadCount > 0 && (
                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                      {data.unreadCount} new
                    </span>
                  )}
                  {data?.connected ? (
                    <CheckCircle className="w-4 h-4 text-success" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
