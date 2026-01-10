import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Conversation } from '@/hooks/useConversations';
import { getChannelConfig } from './channelConfig';
import { SLABadge } from './SLABadge';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

const priorityColors: Record<Conversation['priority'], string> = {
  low: 'bg-slate-500',
  normal: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const statusColors: Record<Conversation['status'], string> = {
  open: 'bg-green-500',
  pending: 'bg-yellow-500',
  resolved: 'bg-blue-500',
  archived: 'bg-slate-500',
};

export function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
  const { customer, channel_type, last_message_preview, last_message_at, unread_count, status, priority } = conversation;
  const channelConfig = getChannelConfig(channel_type);
  const ChannelIcon = channelConfig.icon;

  const customerName = customer?.name || customer?.phone || customer?.email || 'Unknown';
  const initials = customerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = last_message_at
    ? formatDistanceToNow(new Date(last_message_at), { addSuffix: true })
    : '';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors',
        isSelected
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-muted/50'
      )}
    >
      {/* Avatar with channel badge */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-10 h-10">
          <AvatarImage src={customer?.avatar_url || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className={cn(
          'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
          channelConfig.bgColor
        )}>
          <ChannelIcon className={cn('w-3 h-3', channelConfig.color)} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'font-medium truncate',
            unread_count > 0 && 'text-foreground',
            !unread_count && 'text-muted-foreground'
          )}>
            {customerName}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {timeAgo}
          </span>
        </div>

        <p className={cn(
          'text-sm truncate mt-0.5',
          unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
        )}>
          {last_message_preview || 'No messages yet'}
        </p>

        {/* Status and badges */}
        <div className="flex items-center gap-2 mt-1.5">
          <div className={cn('w-2 h-2 rounded-full', statusColors[status])} />
          <span className="text-xs text-muted-foreground capitalize">{status}</span>
          
          {priority !== 'normal' && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              <div className={cn('w-1.5 h-1.5 rounded-full mr-1', priorityColors[priority])} />
              {priority}
            </Badge>
          )}

          {/* SLA Badge */}
          {status !== 'archived' && (
            <SLABadge conversationId={conversation.id} compact />
          )}

          {unread_count > 0 && (
            <Badge className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0">
              {unread_count}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}