import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye,
  Calendar,
  Hash,
  Clock,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { useSocialAnalytics } from '@/hooks/useSocialAnalytics';
import { PostPerformanceChart } from './PostPerformanceChart';
import { PlatformComparison } from './PlatformComparison';
import { TopPerformingPosts } from './TopPerformingPosts';
import { BestPostingTimes } from './BestPostingTimes';
import { HashtagPerformance } from './HashtagPerformance';
import { cn } from '@/lib/utils';

export function SocialAnalyticsDashboard() {
  const {
    loading,
    error,
    totalPosts,
    publishedCount,
    scheduledCount,
    failedCount,
    totalEngagement,
    avgEngagementRate,
    platformStats,
    topPosts,
    bestPostingTimes,
    hashtagPerformance,
    engagementTrend,
    refetch,
  } = useSocialAnalytics();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-destructive">
            <p>Error loading analytics: {error}</p>
            <Button variant="outline" className="mt-4" onClick={refetch}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalPosts === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No analytics data yet</h3>
            <p className="text-sm max-w-md mx-auto">
              Start creating and publishing posts to see detailed analytics about your social media performance.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Analytics Overview</h3>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Posts */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Total Posts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalPosts}</div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                {publishedCount} published
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {scheduledCount} scheduled
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Total Engagement */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Total Engagement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {totalEngagement.toLocaleString()}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" /> Likes
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" /> Comments
              </span>
              <span className="flex items-center gap-1">
                <Share2 className="w-3 h-3" /> Shares
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Avg Engagement Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg. Engagement/Post
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {avgEngagementRate.toFixed(1)}
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm text-success">
              <TrendingUp className="w-4 h-4" />
              interactions per post
            </div>
          </CardContent>
        </Card>

        {/* Platform Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Active Platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{platformStats.length}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {platformStats.slice(0, 3).map((stat) => (
                <Badge key={stat.platform} variant="secondary" className="text-xs">
                  {stat.platform}
                </Badge>
              ))}
              {platformStats.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{platformStats.length - 3}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PostPerformanceChart data={engagementTrend} />
        <PlatformComparison platformStats={platformStats} />
      </div>

      {/* Details Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TopPerformingPosts posts={topPosts} />
        </div>
        <div className="space-y-6">
          <BestPostingTimes timeSlots={bestPostingTimes} />
          <HashtagPerformance hashtags={hashtagPerformance} />
        </div>
      </div>
    </div>
  );
}
