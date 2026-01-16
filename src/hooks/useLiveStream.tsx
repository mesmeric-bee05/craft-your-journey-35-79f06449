import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type LiveStream = Database['public']['Tables']['live_streams']['Row'];
type LiveStreamStatus = Database['public']['Enums']['live_stream_status'];

interface StreamState {
  stream: LiveStream | null;
  mediaStream: MediaStream | null;
  isStreaming: boolean;
  isPreparing: boolean;
  error: string | null;
}

export function useLiveStream() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<StreamState>({
    stream: null,
    mediaStream: null,
    isStreaming: false,
    isPreparing: false,
    error: null,
  });

  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's streams
  const fetchStreams = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStreams(data || []);
    } catch (error: any) {
      console.error('Error fetching streams:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  // Subscribe to realtime updates for active stream
  useEffect(() => {
    if (!state.stream?.id) return;

    const channel = supabase
      .channel(`stream-${state.stream.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${state.stream.id}`,
        },
        (payload) => {
          setState(prev => ({
            ...prev,
            stream: payload.new as LiveStream,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.stream?.id]);

  const getMediaStream = async (includeVideo = true, includeAudio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: includeVideo ? { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        } : false,
        audio: includeAudio ? {
          echoCancellation: true,
          noiseSuppression: true,
        } : false,
      });
      
      streamRef.current = stream;
      setState(prev => ({ ...prev, mediaStream: stream }));
      
      return stream;
    } catch (error: any) {
      const message = error.name === 'NotAllowedError' 
        ? 'Camera/microphone access denied. Please allow access in your browser settings.'
        : 'Failed to access camera/microphone';
      
      setState(prev => ({ ...prev, error: message }));
      toast({
        title: 'Media Access Error',
        description: message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const getScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: true,
      });
      
      streamRef.current = stream;
      setState(prev => ({ ...prev, mediaStream: stream }));
      
      return stream;
    } catch (error: any) {
      const message = 'Screen sharing was cancelled or denied';
      setState(prev => ({ ...prev, error: message }));
      return null;
    }
  };

  const createStream = async (title: string, description?: string) => {
    if (!user || !business) {
      toast({
        title: 'Error',
        description: 'You must be logged in and have a business to start streaming',
        variant: 'destructive',
      });
      return null;
    }

    setState(prev => ({ ...prev, isPreparing: true, error: null }));

    try {
      // Generate a unique stream key
      const streamKey = `${business.id.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          business_id: business.id,
          user_id: user.id,
          title,
          description,
          stream_key: streamKey,
          status: 'preparing' as LiveStreamStatus,
        })
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({ 
        ...prev, 
        stream: data, 
        isPreparing: false 
      }));

      toast({
        title: 'Stream created',
        description: 'Your stream is ready. Start streaming when ready!',
      });

      return data;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isPreparing: false, 
        error: error.message 
      }));
      toast({
        title: 'Failed to create stream',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const startStreaming = async () => {
    if (!state.stream) {
      toast({
        title: 'No stream configured',
        description: 'Please create a stream first',
        variant: 'destructive',
      });
      return false;
    }

    try {
      // Update stream status to live
      const { error } = await supabase
        .from('live_streams')
        .update({
          status: 'live' as LiveStreamStatus,
          started_at: new Date().toISOString(),
        })
        .eq('id', state.stream.id);

      if (error) throw error;

      setState(prev => ({ ...prev, isStreaming: true }));

      toast({
        title: 'You\'re live!',
        description: 'Your stream has started',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to start stream',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const stopStreaming = async () => {
    try {
      // Stop media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Stop media recorder
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }

      // Update stream status
      if (state.stream) {
        await supabase
          .from('live_streams')
          .update({
            status: 'ended' as LiveStreamStatus,
            ended_at: new Date().toISOString(),
          })
          .eq('id', state.stream.id);
      }

      setState({
        stream: null,
        mediaStream: null,
        isStreaming: false,
        isPreparing: false,
        error: null,
      });

      toast({
        title: 'Stream ended',
        description: 'Your live stream has ended',
      });

      await fetchStreams();

      return true;
    } catch (error: any) {
      toast({
        title: 'Error ending stream',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateViewerCount = async (count: number) => {
    if (!state.stream) return;

    await supabase
      .from('live_streams')
      .update({
        viewer_count: count,
        peak_viewers: Math.max(count, state.stream.peak_viewers || 0),
      })
      .eq('id', state.stream.id);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    ...state,
    streams,
    loading,
    getMediaStream,
    getScreenShare,
    createStream,
    startStreaming,
    stopStreaming,
    updateViewerCount,
    refreshStreams: fetchStreams,
  };
}
