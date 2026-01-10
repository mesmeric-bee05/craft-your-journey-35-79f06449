import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Pause, XCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useSLATracking, SLAStatus, SLAStatusInfo } from '@/hooks/useSLATracking';

interface SLAIndicatorProps {
  conversationId: string;
  className?: string;
}

const statusConfig: Record<SLAStatus, { 
  icon: typeof Clock; 
  color: string; 
  progressColor: string;
  label: string;
}> = {
  on_track: {
    icon: Clock,
    color: 'text-green-600',
    progressColor: 'bg-green-500',
    label: 'On Track',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    progressColor: 'bg-yellow-500',
    label: 'Warning',
  },
  breached: {
    icon: XCircle,
    color: 'text-red-600',
    progressColor: 'bg-red-500',
    label: 'Breached',
  },
  resolved: {
    icon: CheckCircle,
    color: 'text-blue-600',
    progressColor: 'bg-blue-500',
    label: 'Resolved',
  },
  paused: {
    icon: Pause,
    color: 'text-muted-foreground',
    progressColor: 'bg-muted-foreground',
    label: 'Paused',
  },
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function SLAIndicator({ conversationId, className }: SLAIndicatorProps) {
  const { getSLAStatus, subscribeToTracking } = useSLATracking();
  const [slaInfo, setSlaInfo] = useState<SLAStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      const status = await getSLAStatus(conversationId);
      if (mounted) {
        setSlaInfo(status);
        setLoading(false);
      }
    };

    fetchStatus();
    const unsubscribe = subscribeToTracking(conversationId);

    // Refresh every minute
    const interval = setInterval(fetchStatus, 60000);

    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [conversationId, getSLAStatus, subscribeToTracking]);

  if (loading) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardContent className="p-3">
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!slaInfo) {
    return null;
  }

  const frConfig = statusConfig[slaInfo.firstResponseStatus];
  const resConfig = statusConfig[slaInfo.resolutionStatus];
  const FRIcon = frConfig.icon;
  const ResIcon = resConfig.icon;

  // Calculate progress percentages (cap at 100 for display)
  const frProgress = slaInfo.firstResponseTime !== null 
    ? Math.min(100, (slaInfo.firstResponseTime / 60) * 100) // Assuming 60 min default target
    : slaInfo.elapsed 
      ? Math.min(100, (slaInfo.elapsed / 60) * 100)
      : 0;

  return (
    <Card className={cn('border-l-4', className, {
      'border-l-green-500': slaInfo.status === 'on_track',
      'border-l-yellow-500': slaInfo.status === 'warning',
      'border-l-red-500': slaInfo.status === 'breached',
      'border-l-blue-500': slaInfo.status === 'resolved',
      'border-l-muted': slaInfo.status === 'paused',
    })}>
      <CardContent className="p-3 space-y-3">
        {/* First Response */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FRIcon className={cn('h-4 w-4', frConfig.color)} />
              <span className="font-medium">First Response</span>
            </div>
            <span className={cn('text-xs', frConfig.color)}>
              {slaInfo.firstResponseTime !== null 
                ? formatDuration(slaInfo.firstResponseTime)
                : slaInfo.firstResponseStatus === 'paused'
                  ? 'Paused'
                  : `${formatDuration(slaInfo.elapsed)} elapsed`
              }
            </span>
          </div>
          <Progress 
            value={frProgress} 
            className="h-1.5"
          />
        </div>

        {/* Resolution */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ResIcon className={cn('h-4 w-4', resConfig.color)} />
              <span className="font-medium">Resolution</span>
            </div>
            <span className={cn('text-xs', resConfig.color)}>
              {slaInfo.resolutionTime !== null 
                ? formatDuration(slaInfo.resolutionTime)
                : slaInfo.resolutionStatus === 'paused'
                  ? 'Paused'
                  : slaInfo.timeRemaining !== null && slaInfo.timeRemaining > 0
                    ? `${formatDuration(slaInfo.timeRemaining)} remaining`
                    : slaInfo.timeRemaining !== null
                      ? `Overdue by ${formatDuration(Math.abs(slaInfo.timeRemaining))}`
                      : 'In progress'
              }
            </span>
          </div>
          <Progress 
            value={Math.min(100, (slaInfo.elapsed / 1440) * 100)} // Assuming 24h default target
            className="h-1.5"
          />
        </div>

        {/* Overall Status */}
        <div className="flex items-center justify-between pt-1 border-t">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Overall SLA</span>
          </div>
          <span className={cn('text-xs font-medium', statusConfig[slaInfo.status].color)}>
            {statusConfig[slaInfo.status].label}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
