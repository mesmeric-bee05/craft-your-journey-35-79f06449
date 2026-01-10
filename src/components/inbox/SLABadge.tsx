import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Pause, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSLATracking, SLAStatus, SLAStatusInfo } from '@/hooks/useSLATracking';

interface SLABadgeProps {
  conversationId: string;
  compact?: boolean;
}

const statusConfig: Record<SLAStatus, { icon: typeof Clock; color: string; bgColor: string; label: string }> = {
  on_track: {
    icon: Clock,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10 border-green-500/20',
    label: 'On Track',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10 border-yellow-500/20',
    label: 'Warning',
  },
  breached: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10 border-red-500/20',
    label: 'Breached',
  },
  resolved: {
    icon: CheckCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    label: 'Met',
  },
  paused: {
    icon: Pause,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    label: 'Paused',
  },
};

function formatTimeRemaining(minutes: number | null): string {
  if (minutes === null) return '';
  
  const absMinutes = Math.abs(minutes);
  const isOverdue = minutes < 0;
  
  if (absMinutes < 60) {
    return `${isOverdue ? '+' : ''}${absMinutes}m`;
  }
  
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  
  if (hours < 24) {
    return `${isOverdue ? '+' : ''}${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${isOverdue ? '+' : ''}${days}d${remainingHours > 0 ? ` ${remainingHours}h` : ''}`;
}

export function SLABadge({ conversationId, compact = false }: SLABadgeProps) {
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

    // Refresh every minute for timer updates
    const interval = setInterval(fetchStatus, 60000);

    return () => {
      mounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [conversationId, getSLAStatus, subscribeToTracking]);

  if (loading || !slaInfo) {
    return null;
  }

  const config = statusConfig[slaInfo.status];
  const Icon = config.icon;

  const tooltipContent = (
    <div className="space-y-1 text-xs">
      <div className="font-medium">SLA Status: {config.label}</div>
      {slaInfo.firstResponseTime !== null && (
        <div>First Response: {slaInfo.firstResponseTime}m</div>
      )}
      {slaInfo.resolutionTime !== null && (
        <div>Resolution: {slaInfo.resolutionTime}m</div>
      )}
      {slaInfo.timeRemaining !== null && slaInfo.status !== 'resolved' && (
        <div>
          {slaInfo.timeRemaining > 0 
            ? `Time remaining: ${formatTimeRemaining(slaInfo.timeRemaining)}`
            : `Overdue by: ${formatTimeRemaining(slaInfo.timeRemaining)}`
          }
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('p-1 rounded', config.bgColor)}>
            <Icon className={cn('h-3 w-3', config.color)} />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipContent}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn('gap-1 text-xs font-normal', config.bgColor)}
        >
          <Icon className={cn('h-3 w-3', config.color)} />
          {slaInfo.status !== 'resolved' && slaInfo.status !== 'paused' && slaInfo.timeRemaining !== null && (
            <span className={config.color}>
              {formatTimeRemaining(slaInfo.timeRemaining)}
            </span>
          )}
          {slaInfo.status === 'resolved' && (
            <span className={config.color}>SLA Met</span>
          )}
          {slaInfo.status === 'paused' && (
            <span className={config.color}>Paused</span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltipContent}</TooltipContent>
    </Tooltip>
  );
}
