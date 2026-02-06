import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PLATFORM_CONFIGS } from './platformConfig';
import { cn } from '@/lib/utils';
import type { PlatformStats } from '@/hooks/useSocialAnalytics';

interface PlatformComparisonProps {
  platformStats: PlatformStats[];
}

export function PlatformComparison({ platformStats }: PlatformComparisonProps) {
  const maxEngagement = Math.max(...platformStats.map(p => p.totalEngagement), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Platform Performance</CardTitle>
        <CardDescription>
          Compare engagement across your social channels
        </CardDescription>
      </CardHeader>
      <CardContent>
        {platformStats.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No platform data available
          </div>
        ) : (
          <div className="space-y-4">
            {platformStats.map((stat) => {
              const config = PLATFORM_CONFIGS[stat.platform];
              const Icon = config?.icon;
              const engagementPercent = (stat.totalEngagement / maxEngagement) * 100;

              return (
                <div key={stat.platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {Icon && (
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config?.bgColor)}>
                          <Icon className={cn('w-4 h-4', config?.color)} />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{config?.name || stat.platform}</p>
                        <p className="text-xs text-muted-foreground">
                          {stat.publishedPosts} published · {stat.scheduledPosts} scheduled
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{stat.totalEngagement.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.avgEngagementRate.toFixed(1)} avg/post
                      </p>
                    </div>
                  </div>
                  <Progress value={engagementPercent} className="h-2" />
                  {stat.topHashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {stat.topHashtags.slice(0, 3).map((ht) => (
                        <Badge key={ht.tag} variant="secondary" className="text-xs">
                          #{ht.tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
