import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface OverlayPosition {
  x: number;
  y: number;
}

export interface OverlaySize {
  width: number;
  height: number;
}

export interface OverlayContent {
  text?: string;
  imageUrl?: string;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: string;
}

export interface StreamOverlay {
  id: string;
  stream_id: string | null;
  user_id: string;
  name: string;
  type: 'text' | 'image' | 'ticker' | 'alert';
  content: OverlayContent;
  position: OverlayPosition;
  size: OverlaySize;
  is_visible: boolean;
  z_index: number;
  created_at: string;
  updated_at: string;
}

interface UseStreamOverlaysProps {
  streamId?: string | null;
}

export function useStreamOverlays({ streamId }: UseStreamOverlaysProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [overlays, setOverlays] = useState<StreamOverlay[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch overlays
  const fetchOverlays = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('stream_overlays')
        .select('*')
        .eq('user_id', user.id)
        .order('z_index', { ascending: true });

      if (streamId && /^[0-9a-f-]{36}$/i.test(streamId)) {
        query = query.or(`stream_id.eq.${streamId},stream_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedOverlays = (data || []).map(o => ({
        ...o,
        type: o.type as 'text' | 'image' | 'ticker' | 'alert',
        content: o.content as unknown as OverlayContent,
        position: o.position as unknown as OverlayPosition,
        size: o.size as unknown as OverlaySize,
      })) as StreamOverlay[];

      setOverlays(typedOverlays);
    } catch (error: any) {
      console.error('Error fetching overlays:', error);
    } finally {
      setLoading(false);
    }
  }, [user, streamId]);

  useEffect(() => {
    fetchOverlays();
  }, [fetchOverlays]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`overlays-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_overlays',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOverlay = {
              ...payload.new,
              type: payload.new.type as 'text' | 'image' | 'ticker' | 'alert',
              content: payload.new.content as OverlayContent,
              position: payload.new.position as OverlayPosition,
              size: payload.new.size as OverlaySize,
            } as StreamOverlay;
            setOverlays(prev => [...prev, newOverlay]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = {
              ...payload.new,
              type: payload.new.type as 'text' | 'image' | 'ticker' | 'alert',
              content: payload.new.content as OverlayContent,
              position: payload.new.position as OverlayPosition,
              size: payload.new.size as OverlaySize,
            } as StreamOverlay;
            setOverlays(prev => prev.map(o => o.id === updated.id ? updated : o));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setOverlays(prev => prev.filter(o => o.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Create overlay
  const createOverlay = useCallback(async (
    name: string,
    type: 'text' | 'image' | 'ticker' | 'alert',
    content: OverlayContent,
    options?: {
      position?: OverlayPosition;
      size?: OverlaySize;
      forStream?: string;
    }
  ) => {
    if (!user) return null;

    try {
      const maxZIndex = Math.max(...overlays.map(o => o.z_index), 0);

      const { data, error } = await supabase
        .from('stream_overlays')
        .insert({
          user_id: user.id,
          stream_id: options?.forStream || streamId || null,
          name,
          type,
          content: content as unknown as Record<string, any>,
          position: (options?.position || { x: 50, y: 50 }) as unknown as Record<string, any>,
          size: (options?.size || { width: 200, height: 50 }) as unknown as Record<string, any>,
          is_visible: true,
          z_index: maxZIndex + 1,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Overlay created!' });
      return data;
    } catch (error: any) {
      toast({
        title: 'Failed to create overlay',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [user, streamId, overlays, toast]);

  // Update overlay
  const updateOverlay = useCallback(async (
    overlayId: string,
    updates: Partial<Pick<StreamOverlay, 'name' | 'content' | 'position' | 'size' | 'is_visible' | 'z_index'>>
  ) => {
    try {
      const dbUpdates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.is_visible !== undefined) dbUpdates.is_visible = updates.is_visible;
      if (updates.z_index !== undefined) dbUpdates.z_index = updates.z_index;
      if (updates.content !== undefined) dbUpdates.content = updates.content as unknown as Record<string, any>;
      if (updates.position !== undefined) dbUpdates.position = updates.position as unknown as Record<string, any>;
      if (updates.size !== undefined) dbUpdates.size = updates.size as unknown as Record<string, any>;
      
      const { error } = await supabase
        .from('stream_overlays')
        .update(dbUpdates)
        .eq('id', overlayId);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Failed to update overlay',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Toggle visibility
  const toggleVisibility = useCallback(async (overlayId: string) => {
    const overlay = overlays.find(o => o.id === overlayId);
    if (!overlay) return;

    await updateOverlay(overlayId, { is_visible: !overlay.is_visible });
  }, [overlays, updateOverlay]);

  // Update position
  const updatePosition = useCallback(async (overlayId: string, position: OverlayPosition) => {
    await updateOverlay(overlayId, { position });
  }, [updateOverlay]);

  // Update size
  const updateSize = useCallback(async (overlayId: string, size: OverlaySize) => {
    await updateOverlay(overlayId, { size });
  }, [updateOverlay]);

  // Delete overlay
  const deleteOverlay = useCallback(async (overlayId: string) => {
    try {
      const { error } = await supabase
        .from('stream_overlays')
        .delete()
        .eq('id', overlayId);

      if (error) throw error;

      toast({ title: 'Overlay deleted' });
    } catch (error: any) {
      toast({
        title: 'Failed to delete overlay',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Get visible overlays
  const visibleOverlays = overlays.filter(o => o.is_visible);

  return {
    overlays,
    visibleOverlays,
    loading,
    createOverlay,
    updateOverlay,
    toggleVisibility,
    updatePosition,
    updateSize,
    deleteOverlay,
    refetch: fetchOverlays,
  };
}
