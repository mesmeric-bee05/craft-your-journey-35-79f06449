import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { QuickRepliesPopover } from './QuickRepliesPopover';

interface MessageInputProps {
  onSend: (content: string, isInternal: boolean) => Promise<void>;
  conversationId: string;
}

export function MessageInput({ onSend, conversationId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSend(message.trim(), isInternal);
      setMessage('');
      setIsInternal(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReplySelect = (content: string) => {
    setMessage(content);
    textareaRef.current?.focus();
  };

  return (
    <div className="p-4 border-t border-border bg-background">
      {isInternal && (
        <div className="flex items-center gap-2 mb-2 text-sm text-yellow-600 dark:text-yellow-400">
          <Lock className="w-4 h-4" />
          <span>This is an internal note (only visible to your team)</span>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isInternal ? 'Write an internal note...' : 'Type a message...'}
            className="min-h-[44px] max-h-[150px] resize-none pr-24"
            rows={1}
          />
          
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Smile className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Emoji</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <QuickRepliesPopover onSelect={handleQuickReplySelect}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-11 w-11">
                  <Zap className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Quick replies</TooltipContent>
            </Tooltip>
          </QuickRepliesPopover>

          <Toggle
            pressed={isInternal}
            onPressedChange={setIsInternal}
            className="h-11 w-11 data-[state=on]:bg-yellow-100 dark:data-[state=on]:bg-yellow-900/30"
          >
            <Lock className="w-4 h-4" />
          </Toggle>

          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className="h-11 px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
