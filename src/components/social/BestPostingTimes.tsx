import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { TimeSlotPerformance } from '@/hooks/useSocialAnalytics';

interface BestPostingTimesProps {
  timeSlots: TimeSlotPerformance[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function BestPostingTimes({ timeSlots }: BestPostingTimesProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Best Posting Times</CardTitle>
        </div>
        <CardDescription className="text-xs">
          When your audience is most engaged
        </CardDescription>
      </CardHeader>
      <CardContent>
        {timeSlots.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Not enough data yet
          </div>
        ) : (
          <div className="space-y-2">
            {timeSlots.slice(0, 5).map((slot, index) => (
              <div
                key={`${slot.dayOfWeek}-${slot.hour}`}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={index === 0 ? 'default' : 'secondary'} 
                    className="w-6 h-6 p-0 flex items-center justify-center text-xs"
                  >
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">
                      {DAYS[slot.dayOfWeek]} at {formatHour(slot.hour)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slot.postCount} posts
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{slot.avgEngagement.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">avg eng.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
