import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type StreamDestinationRow = Database['public']['Tables']['live_stream_destinations']['Row'];
type StreamDestination = Omit<StreamDestinationRow, 'stream_key' | 'rtmp_url'> & {
  stream_key?: string | null;
  rtmp_url?: string | null;
};

const SAFE_DEST_COLS = 'id,stream_id,platform,status,error_message,created_at';

interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  rtmpUrlPlaceholder: string;
  streamKeyPlaceholder: string;
  helpUrl: string;
}

export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    id: 'facebook',
    name: 'Facebook Live',
    icon: '📘',
    color: '#1877F2',
    rtmpUrlPlaceholder: 'rtmps://live-api-s.facebook.com:443/rtmp/',
    streamKeyPlaceholder: 'Your Facebook stream key',
    helpUrl: 'https://www.facebook.com/formedia/tools/facebook-live',
  },
  {
    id: 'youtube',
    name: 'YouTube Live',
    icon: '📺',
    color: '#FF0000',
    rtmpUrlPlaceholder: 'rtmp://a.rtmp.youtube.com/live2',
    streamKeyPlaceholder: 'Your YouTube stream key',
    helpUrl: 'https://support.google.com/youtube/answer/2853702',
  },
  {
    id: 'instagram',
    name: 'Instagram Live',
    icon: '📷',
    color: '#E4405F',
    rtmpUrlPlaceholder: 'Instagram requires mobile app or third-party tools',
    streamKeyPlaceholder: 'Not directly supported',
    helpUrl: 'https://help.instagram.com/',
  },
  {
    id: 'tiktok',
    name: 'TikTok Live',
    icon: '🎵',
    color: '#000000',
    rtmpUrlPlaceholder: 'TikTok RTMP server URL',
    streamKeyPlaceholder: 'Your TikTok stream key',
    helpUrl: 'https://www.tiktok.com/creators/creator-portal/',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    icon: '🎮',
    color: '#9146FF',
    rtmpUrlPlaceholder: 'rtmp://live.twitch.tv/app/',
    streamKeyPlaceholder: 'Your Twitch stream key',
    helpUrl: 'https://help.twitch.tv/s/article/go-live',
  },
  {
    id: 'custom',
    name: 'Custom RTMP',
    icon: '🔧',
    color: '#6B7280',
    rtmpUrlPlaceholder: 'rtmp://your-server.com/live',
    streamKeyPlaceholder: 'Your stream key',
    helpUrl: '',
  },
];

export function useStreamDestinations(streamId?: string) {
  const { toast } = useToast();
  const [destinations, setDestinations] = useState<StreamDestination[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDestinations = useCallback(async () => {
    if (!streamId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('live_stream_destinations')
        .select(SAFE_DEST_COLS)
        .eq('stream_id', streamId);

      if (error) throw error;
      setDestinations(data || []);
    } catch (error: any) {
      console.error('Error fetching destinations:', error);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  const addDestination = async (
    platform: string,
    rtmpUrl: string,
    streamKey: string
  ) => {
    if (!streamId) {
      toast({
        title: 'No stream selected',
        description: 'Please create or select a stream first',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('live_stream_destinations')
        .insert({
          stream_id: streamId,
          platform,
          rtmp_url: rtmpUrl,
          stream_key: streamKey,
          status: 'pending',
        })
        .select(SAFE_DEST_COLS)
        .single();

      if (error) throw error;

      setDestinations(prev => [...prev, data]);

      toast({
        title: 'Destination added',
        description: `${platform} has been added as a streaming destination`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: 'Failed to add destination',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateDestination = async (
    destinationId: string,
    updates: Partial<Pick<StreamDestination, 'rtmp_url' | 'stream_key' | 'status'>>
  ) => {
    try {
      const { data, error } = await supabase
        .from('live_stream_destinations')
        .update(updates)
        .eq('id', destinationId)
        .select()
        .single();

      if (error) throw error;

      setDestinations(prev => 
        prev.map(d => d.id === destinationId ? data : d)
      );

      return data;
    } catch (error: any) {
      toast({
        title: 'Failed to update destination',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const removeDestination = async (destinationId: string) => {
    try {
      const { error } = await supabase
        .from('live_stream_destinations')
        .delete()
        .eq('id', destinationId);

      if (error) throw error;

      setDestinations(prev => prev.filter(d => d.id !== destinationId));

      toast({
        title: 'Destination removed',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to remove destination',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const getPlatformConfig = (platformId: string) => {
    return PLATFORM_CONFIGS.find(p => p.id === platformId) || PLATFORM_CONFIGS[PLATFORM_CONFIGS.length - 1];
  };

  return {
    destinations,
    loading,
    addDestination,
    updateDestination,
    removeDestination,
    getPlatformConfig,
    refreshDestinations: fetchDestinations,
  };
}
