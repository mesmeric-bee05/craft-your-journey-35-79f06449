import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type ScheduledPost = Database['public']['Tables']['scheduled_posts']['Row'];
type PostStatus = Database['public']['Enums']['post_status'];
type ChannelType = Database['public']['Enums']['channel_type'];

export interface CreatePostData {
  content: string;
  channelType: ChannelType;
  scheduledFor: Date;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  channelId?: string;
  campaignId?: string;
  platformSettings?: Record<string, unknown>;
}

export interface UpdatePostData {
  content?: string;
  scheduledFor?: Date;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  status?: PostStatus;
  platformSettings?: Record<string, unknown>;
}

interface UseScheduledPostsReturn {
  posts: ScheduledPost[];
  loading: boolean;
  error: string | null;
  createPost: (data: CreatePostData) => Promise<ScheduledPost | null>;
  updatePost: (id: string, data: UpdatePostData) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;
  getPostsByDateRange: (startDate: Date, endDate: Date) => Promise<ScheduledPost[]>;
  getPostsByStatus: (status: PostStatus) => Promise<ScheduledPost[]>;
  getPostsByPlatform: (channelType: ChannelType) => Promise<ScheduledPost[]>;
  publishNow: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useScheduledPosts(): UseScheduledPostsReturn {
  const { business } = useBusiness();
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('business_id', business.id)
        .order('scheduled_for', { ascending: true });

      if (fetchError) throw fetchError;

      setPosts(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch posts';
      setError(message);
      logger.error('Error fetching scheduled posts', err, { hook: 'useScheduledPosts' });
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Real-time subscription
  useEffect(() => {
    if (!business?.id) return;

    const channel = supabase
      .channel('scheduled-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_posts',
          filter: `business_id=eq.${business.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPosts((prev) => [...prev, payload.new as ScheduledPost].sort(
              (a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()
            ));
          } else if (payload.eventType === 'UPDATE') {
            setPosts((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as ScheduledPost) : p))
            );
          } else if (payload.eventType === 'DELETE') {
            setPosts((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id]);

  const createPost = async (data: CreatePostData): Promise<ScheduledPost | null> => {
    if (!business?.id || !user?.id) {
      toast({ title: 'Error', description: 'Business not found', variant: 'destructive' });
      return null;
    }

    try {
      const insertData = {
        business_id: business.id,
        created_by: user.id,
        content: data.content,
        channel_type: data.channelType,
        scheduled_for: data.scheduledFor.toISOString(),
        media_urls: data.mediaUrls || [],
        hashtags: data.hashtags || [],
        mentions: data.mentions || [],
        channel_id: data.channelId,
        campaign_id: data.campaignId,
        platform_settings: data.platformSettings || {},
        status: 'scheduled' as PostStatus,
      };

      const { data: newPost, error: createError } = await supabase
        .from('scheduled_posts')
        .insert(insertData as any)
        .select()
        .single();

      if (createError) throw createError;

      toast({ title: 'Post scheduled successfully!' });
      return newPost;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create post';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      logger.error('Error creating scheduled post', err, { hook: 'useScheduledPosts' });
      return null;
    }
  };

  const updatePost = async (id: string, data: UpdatePostData): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (data.content !== undefined) updateData.content = data.content;
      if (data.scheduledFor !== undefined) updateData.scheduled_for = data.scheduledFor.toISOString();
      if (data.mediaUrls !== undefined) updateData.media_urls = data.mediaUrls;
      if (data.hashtags !== undefined) updateData.hashtags = data.hashtags;
      if (data.mentions !== undefined) updateData.mentions = data.mentions;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.platformSettings !== undefined) updateData.platform_settings = data.platformSettings;

      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      toast({ title: 'Post updated successfully!' });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update post';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      logger.error('Error updating scheduled post', err, { hook: 'useScheduledPosts', postId: id });
      return false;
    }
  };

  const deletePost = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast({ title: 'Post deleted successfully!' });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete post';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      logger.error('Error deleting scheduled post', err, { hook: 'useScheduledPosts', postId: id });
      return false;
    }
  };

  const getPostsByDateRange = async (startDate: Date, endDate: Date): Promise<ScheduledPost[]> => {
    if (!business?.id) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('business_id', business.id)
        .gte('scheduled_for', startDate.toISOString())
        .lte('scheduled_for', endDate.toISOString())
        .order('scheduled_for', { ascending: true });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      logger.error('Error fetching posts by date range', err, { hook: 'useScheduledPosts' });
      return [];
    }
  };

  const getPostsByStatus = async (status: PostStatus): Promise<ScheduledPost[]> => {
    if (!business?.id) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('business_id', business.id)
        .eq('status', status)
        .order('scheduled_for', { ascending: true });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      logger.error('Error fetching posts by status', err, { hook: 'useScheduledPosts' });
      return [];
    }
  };

  const getPostsByPlatform = async (channelType: ChannelType): Promise<ScheduledPost[]> => {
    if (!business?.id) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('business_id', business.id)
        .eq('channel_type', channelType)
        .order('scheduled_for', { ascending: true });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      logger.error('Error fetching posts by platform', err, { hook: 'useScheduledPosts' });
      return [];
    }
  };

  const publishNow = async (id: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('scheduled_posts')
        .update({
          status: 'published' as PostStatus,
          published_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast({ title: 'Post published!' });
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish post';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      logger.error('Error publishing post', err, { hook: 'useScheduledPosts', postId: id });
      return false;
    }
  };

  return {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    getPostsByDateRange,
    getPostsByStatus,
    getPostsByPlatform,
    publishNow,
    refetch: fetchPosts,
  };
}
