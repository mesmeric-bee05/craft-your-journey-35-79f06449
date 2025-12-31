import { format } from 'date-fns';
import { Check, CheckCheck, Clock, AlertCircle, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/hooks/useMessages';

interface MessageBubbleProps {
  message: Message;
}

const statusIcons: Record<Message['status'], React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  sent: <Check className="w-3 h-3" />,
  delivered: <CheckCheck className="w-3 h-3" />,
  read: <CheckCheck className="w-3 h-3 text-blue-500" />,
  failed: <AlertCircle className="w-3 h-3 text-destructive" />,
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = message.sender_type === 'agent' || message.sender_type === 'bot';
  const isInternal = message.is_internal;
  const isSystem = message.sender_type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-muted px-4 py-2 rounded-full text-sm text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex',
      isAgent ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'max-w-[75%] rounded-2xl px-4 py-2.5',
        isAgent 
          ? isInternal 
            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-foreground border border-yellow-300 dark:border-yellow-700'
            : 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground'
      )}>
        {isInternal && (
          <div className="flex items-center gap-1 text-xs text-yellow-700 dark:text-yellow-300 mb-1">
            <Lock className="w-3 h-3" />
            Internal Note
          </div>
        )}

        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs',
          isAgent 
            ? isInternal
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-primary-foreground/70'
            : 'text-muted-foreground'
        )}>
          <span>{format(new Date(message.created_at), 'HH:mm')}</span>
          {isAgent && !isInternal && statusIcons[message.status]}
        </div>
      </div>
    </div>
  );
}
