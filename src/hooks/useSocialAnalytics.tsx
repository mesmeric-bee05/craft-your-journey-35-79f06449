import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { logger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';

type ScheduledPost = Database['public']['Tables']['scheduled_posts']['Row'];
type ChannelType = Database['public']['Enums']['channel_type'];

export interface PostMetrics {
  likes?: number;
  comments?: number;
  shares?: number;
  impressions?: number;
  reach?: number;
  engagement_rate?: number;
  clicks?: number;
  saves?: number;
}

export interface PlatformStats {
  platform: ChannelType;
  totalPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topHashtags: { tag: string; count: number }[];
}

export interface TimeSlotPerformance {
  hour: number;
  dayOfWeek: number;
  avgEngagement: number;
  postCount: number;
}

export interface TopPost {
  id: string;
  content: string;
  platform: ChannelType;
  publishedAt: string | null;
  metrics: PostMetrics;
  engagementScore: number;
}

export interface AnalyticsDateRange {
  startDate: Date;
  endDate: Date;
}

interface UseSocialAnalyticsReturn {
  posts: ScheduledPost[];
  loading: boolean;
  error: string | null;
  dateRange: AnalyticsDateRange;
  setDateRange: (range: AnalyticsDateRange) => void;
  platformStats: PlatformStats[];
  topPosts: TopPost[];
  totalPosts: number;
  publishedCount: number;
  scheduledCount: number;
  failedCount: number;
  totalEngagement: number;
  avgEngagementRate: number;
  bestPostingTimes: TimeSlotPerformance[];
  hashtagPerformance: { tag: string; engagementRate: number; postCount: number }[];
  engagementTrend: { date: string; engagement: number; posts: number }[];
  refetch: () => Promise<void>;
}

export function useSocialAnalytics(): UseSocialAnalyticsReturn {
  const { business } = useBusiness();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
  });

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
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPosts(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(message);
      logger.error('Error fetching social analytics', err, { hook: 'useSocialAnalytics' });
    } finally {
      setLoading(false);
    }
  }, [business?.id, dateRange]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Calculate metrics
  const { 
    platformStats, 
    topPosts, 
    totalPosts, 
    publishedCount, 
    scheduledCount, 
    failedCount,
    totalEngagement,
    avgEngagementRate,
    bestPostingTimes,
    hashtagPerformance,
    engagementTrend 
  } = useMemo(() => {
    const publishedPosts = posts.filter(p => p.status === 'published');
    const scheduledPosts = posts.filter(p => p.status === 'scheduled');
    const failedPosts = posts.filter(p => p.status === 'failed');

    // Platform statistics
    const platformMap = new Map<ChannelType, {
      posts: ScheduledPost[];
      totalEngagement: number;
      hashtagCounts: Map<string, number>;
    }>();

    posts.forEach(post => {
      const platform = post.channel_type;
      if (!platformMap.has(platform)) {
        platformMap.set(platform, { posts: [], totalEngagement: 0, hashtagCounts: new Map() });
      }
      const entry = platformMap.get(platform)!;
      entry.posts.push(post);

      const metrics = (post.metrics as PostMetrics) || {};
      const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
      entry.totalEngagement += engagement;

      // Count hashtags
      (post.hashtags || []).forEach(tag => {
        entry.hashtagCounts.set(tag, (entry.hashtagCounts.get(tag) || 0) + 1);
      });
    });

    const platformStats: PlatformStats[] = Array.from(platformMap.entries()).map(([platform, data]) => {
      const published = data.posts.filter(p => p.status === 'published');
      const scheduled = data.posts.filter(p => p.status === 'scheduled');
      
      const topHashtags = Array.from(data.hashtagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));

      return {
        platform,
        totalPosts: data.posts.length,
        publishedPosts: published.length,
        scheduledPosts: scheduled.length,
        totalEngagement: data.totalEngagement,
        avgEngagementRate: published.length > 0 ? data.totalEngagement / published.length : 0,
        topHashtags,
      };
    });

    // Top performing posts
    const topPosts: TopPost[] = publishedPosts
      .map(post => {
        const metrics = (post.metrics as PostMetrics) || {};
        const engagementScore = (metrics.likes || 0) * 1 + 
                               (metrics.comments || 0) * 2 + 
                               (metrics.shares || 0) * 3 +
                               (metrics.saves || 0) * 2;
        return {
          id: post.id,
          content: post.content,
          platform: post.channel_type,
          publishedAt: post.published_at,
          metrics,
          engagementScore,
        };
      })
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10);

    // Total engagement calculation
    const totalEngagement = publishedPosts.reduce((sum, post) => {
      const metrics = (post.metrics as PostMetrics) || {};
      return sum + (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
    }, 0);

    const avgEngagementRate = publishedPosts.length > 0 ? totalEngagement / publishedPosts.length : 0;

    // Best posting times analysis
    const timeSlotMap = new Map<string, { totalEngagement: number; count: number }>();
    publishedPosts.forEach(post => {
      if (!post.published_at) return;
      const date = new Date(post.published_at);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const key = `${dayOfWeek}-${hour}`;
      
      const metrics = (post.metrics as PostMetrics) || {};
      const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
      
      const existing = timeSlotMap.get(key) || { totalEngagement: 0, count: 0 };
      timeSlotMap.set(key, {
        totalEngagement: existing.totalEngagement + engagement,
        count: existing.count + 1,
      });
    });

    const bestPostingTimes: TimeSlotPerformance[] = Array.from(timeSlotMap.entries())
      .map(([key, data]) => {
        const [dayOfWeek, hour] = key.split('-').map(Number);
        return {
          hour,
          dayOfWeek,
          avgEngagement: data.count > 0 ? data.totalEngagement / data.count : 0,
          postCount: data.count,
        };
      })
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 10);

    // Hashtag performance
    const hashtagMap = new Map<string, { totalEngagement: number; count: number }>();
    publishedPosts.forEach(post => {
      const metrics = (post.metrics as PostMetrics) || {};
      const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
      
      (post.hashtags || []).forEach(tag => {
        const existing = hashtagMap.get(tag) || { totalEngagement: 0, count: 0 };
        hashtagMap.set(tag, {
          totalEngagement: existing.totalEngagement + engagement,
          count: existing.count + 1,
        });
      });
    });

    const hashtagPerformance = Array.from(hashtagMap.entries())
      .map(([tag, data]) => ({
        tag,
        engagementRate: data.count > 0 ? data.totalEngagement / data.count : 0,
        postCount: data.count,
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 15);

    // Engagement trend over time
    const trendMap = new Map<string, { engagement: number; posts: number }>();
    publishedPosts.forEach(post => {
      if (!post.published_at) return;
      const date = new Date(post.published_at).toISOString().split('T')[0];
      const metrics = (post.metrics as PostMetrics) || {};
      const engagement = (metrics.likes || 0) + (metrics.comments || 0) + (metrics.shares || 0);
      
      const existing = trendMap.get(date) || { engagement: 0, posts: 0 };
      trendMap.set(date, {
        engagement: existing.engagement + engagement,
        posts: existing.posts + 1,
      });
    });

    const engagementTrend = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      platformStats,
      topPosts,
      totalPosts: posts.length,
      publishedCount: publishedPosts.length,
      scheduledCount: scheduledPosts.length,
      failedCount: failedPosts.length,
      totalEngagement,
      avgEngagementRate,
      bestPostingTimes,
      hashtagPerformance,
      engagementTrend,
    };
  }, [posts]);

  return {
    posts,
    loading,
    error,
    dateRange,
    setDateRange,
    platformStats,
    topPosts,
    totalPosts,
    publishedCount,
    scheduledCount,
    failedCount,
    totalEngagement,
    avgEngagementRate,
    bestPostingTimes,
    hashtagPerformance,
    engagementTrend,
    refetch: fetchPosts,
  };
}
