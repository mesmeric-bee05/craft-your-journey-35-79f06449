import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MessageCircle, Share2, Bookmark, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { PLATFORM_CONFIGS } from './platformConfig';
import { cn } from '@/lib/utils';
import type { TopPost } from '@/hooks/useSocialAnalytics';

interface TopPerformingPostsProps {
  posts: TopPost[];
}

export function TopPerformingPosts({ posts }: TopPerformingPostsProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <CardTitle className="text-lg">Top Performing Posts</CardTitle>
        </div>
        <CardDescription>
          Your best content based on engagement score
        </CardDescription>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No published posts with engagement data yet
          </div>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-4">
              {posts.map((post, index) => {
                const config = PLATFORM_CONFIGS[post.platform];
                const Icon = config?.icon;

                return (
                  <div
                    key={post.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                        index === 0 ? 'bg-primary/20 text-primary' :
                        index === 1 ? 'bg-secondary text-secondary-foreground' :
                        index === 2 ? 'bg-accent text-accent-foreground' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {index + 1}
                      </div>
                    </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {Icon && (
                            <div className={cn('w-5 h-5 rounded flex items-center justify-center', config?.bgColor)}>
                              <Icon className={cn('w-3 h-3', config?.color)} />
                            </div>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {config?.name || post.platform}
                          </Badge>
                          {post.publishedAt && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(post.publishedAt), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm line-clamp-2 mb-2">{post.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {(post.metrics.likes || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {(post.metrics.comments || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 className="w-3 h-3" />
                            {(post.metrics.shares || 0).toLocaleString()}
                          </span>
                          {post.metrics.saves !== undefined && (
                            <span className="flex items-center gap-1">
                              <Bookmark className="w-3 h-3" />
                              {post.metrics.saves.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          {post.engagementScore}
                        </div>
                        <div className="text-xs text-muted-foreground">score</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
