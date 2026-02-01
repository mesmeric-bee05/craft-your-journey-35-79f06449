import { cn } from '@/lib/utils';

interface TypingUser {
  user_id: string;
  user_name: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].user_name} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].user_name} and ${typingUsers[1].user_name} are typing`;
    } else {
      return `${typingUsers.length} people are typing`;
    }
  };

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground', className)}>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
}
