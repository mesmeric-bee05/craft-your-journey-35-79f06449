import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface ConnectedChannel {
  id: string;
  business_id: string;
  channel_type: string;
  channel_name: string | null;
  is_connected: boolean;
  is_active: boolean;
  connected_at: string | null;
  metadata: Record<string, any>;
}

export function useConnectedChannels() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [channels, setChannels] = useState<ConnectedChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('social_channels')
        .select('*')
        .eq('business_id', business.id)
        .order('channel_type');

      if (error) throw error;
      setChannels(data as ConnectedChannel[]);
    } catch (err: any) {
      logger.error('Error fetching channels', err, { hook: 'useConnectedChannels' });
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const connectChannel = async (channelType: string, channelName?: string) => {
    if (!business?.id) return;

    try {
      const { data, error } = await supabase
        .from('social_channels')
        .insert({
          business_id: business.id,
          channel_type: channelType as 'whatsapp' | 'instagram' | 'facebook' | 'tiktok' | 'twitter' | 'telegram' | 'sms' | 'email',
          channel_name: channelName || channelType,
          is_connected: true,
          is_active: true,
          connected_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setChannels(prev => [...prev, data as ConnectedChannel]);
      toast({ title: `${channelType} connected successfully` });
    } catch (err: any) {
      toast({ title: 'Error connecting channel', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  const disconnectChannel = async (channelId: string) => {
    try {
      const { error } = await supabase
        .from('social_channels')
        .update({ is_connected: false, is_active: false })
        .eq('id', channelId);

      if (error) throw error;

      setChannels(prev =>
        prev.map(c => c.id === channelId ? { ...c, is_connected: false, is_active: false } : c)
      );
      toast({ title: 'Channel disconnected' });
    } catch (err: any) {
      toast({ title: 'Error disconnecting channel', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  const toggleChannelActive = async (channelId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('social_channels')
        .update({ is_active: isActive })
        .eq('id', channelId);

      if (error) throw error;

      setChannels(prev =>
        prev.map(c => c.id === channelId ? { ...c, is_active: isActive } : c)
      );
      toast({ title: isActive ? 'Channel activated' : 'Channel paused' });
    } catch (err: any) {
      toast({ title: 'Error updating channel', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  const updateChannelSettings = async (channelId: string, settings: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('social_channels')
        .update({ 
          settings,
          metadata: settings, // Store in metadata for easy access
        })
        .eq('id', channelId);

      if (error) throw error;

      setChannels(prev =>
        prev.map(c => c.id === channelId ? { ...c, metadata: { ...c.metadata, ...settings } } : c)
      );
      toast({ title: 'Channel settings updated' });
    } catch (err: any) {
      toast({ title: 'Error updating settings', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  return {
    channels,
    loading,
    connectChannel,
    disconnectChannel,
    toggleChannelActive,
    updateChannelSettings,
    refetch: fetchChannels,
  };
}
