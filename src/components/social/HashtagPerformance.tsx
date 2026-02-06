import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hash, TrendingUp } from 'lucide-react';

interface HashtagData {
  tag: string;
  engagementRate: number;
  postCount: number;
}

interface HashtagPerformanceProps {
  hashtags: HashtagData[];
}

export function HashtagPerformance({ hashtags }: HashtagPerformanceProps) {
  const maxEngagement = Math.max(...hashtags.map(h => h.engagementRate), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Top Hashtags</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Hashtags driving the most engagement
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hashtags.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No hashtag data yet
          </div>
        ) : (
          <div className="space-y-2">
            {hashtags.slice(0, 6).map((hashtag, index) => {
              const widthPercent = (hashtag.engagementRate / maxEngagement) * 100;
              
              return (
                <div key={hashtag.tag} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-mono">
                        #{hashtag.tag}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ({hashtag.postCount})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="w-3 h-3 text-success" />
                      <span className="font-medium">{hashtag.engagementRate.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
