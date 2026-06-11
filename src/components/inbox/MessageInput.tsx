import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Send, Paperclip, Smile, Lock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { QuickRepliesPopover } from './QuickRepliesPopover';
import { useQuickReplies } from '@/hooks/useQuickReplies';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (content: string, isInternal: boolean) => Promise<void>;
  conversationId: string;
  onTyping?: () => void;
}

export interface MessageInputRef {
  focus: () => void;
}

export const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(({ onSend, conversationId, onTyping }, ref) => {
  const [message, setMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [shortcutMenuOpen, setShortcutMenuOpen] = useState(false);
  const [shortcutSearch, setShortcutSearch] = useState('');
  const [selectedShortcutIndex, setSelectedShortcutIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shortcutMenuRef = useRef<HTMLDivElement>(null);
  
  const { quickReplies, incrementUsage } = useQuickReplies();

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    }
  }));

  // Detect /shortcut pattern in message
  useEffect(() => {
    const slashMatch = message.match(/\/(\w*)$/);
    if (slashMatch) {
      setShortcutSearch(slashMatch[1].toLowerCase());
      setShortcutMenuOpen(true);
      setSelectedShortcutIndex(0);
    } else {
      setShortcutMenuOpen(false);
      setShortcutSearch('');
    }
  }, [message]);

  // Filter quick replies based on shortcut search
  const filteredShortcuts = useMemo(() => {
    if (!shortcutSearch && shortcutMenuOpen) {
      // Show all shortcuts when just "/" is typed
      return quickReplies.filter(r => r.shortcut);
    }
    return quickReplies.filter(
      (reply) =>
        reply.shortcut?.toLowerCase().includes(shortcutSearch) ||
        reply.title.toLowerCase().includes(shortcutSearch)
    );
  }, [quickReplies, shortcutSearch, shortcutMenuOpen]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleShortcutSelect = (reply: typeof quickReplies[0]) => {
    // Replace the /shortcut with the reply content
    const newMessage = message.replace(/\/\w*$/, reply.content);
    setMessage(newMessage);
    setShortcutMenuOpen(false);
    incrementUsage(reply.id);
    textareaRef.current?.focus();
  };

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
    // Handle shortcut menu navigation
    if (shortcutMenuOpen && filteredShortcuts.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedShortcutIndex((prev) => 
          prev < filteredShortcuts.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedShortcutIndex((prev) => 
          prev > 0 ? prev - 1 : filteredShortcuts.length - 1
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleShortcutSelect(filteredShortcuts[selectedShortcutIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShortcutMenuOpen(false);
        return;
      }
    }

    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
      return;
    }
    // Regular Enter to send (Shift+Enter for newline)
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
    <div className="p-4 border-t border-border bg-background relative">
      {isInternal && (
        <div className="flex items-center gap-2 mb-2 text-sm text-yellow-600 dark:text-yellow-400">
          <Lock className="w-4 h-4" />
          <span>This is an internal note (only visible to your team)</span>
        </div>
      )}

      {/* Shortcut Menu */}
      {shortcutMenuOpen && filteredShortcuts.length > 0 && (
        <div
          ref={shortcutMenuRef}
          className="absolute bottom-full left-4 right-4 mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
        >
          <div className="p-2 border-b border-border bg-muted/50">
            <span className="text-xs text-muted-foreground">
              Type <kbd className="px-1.5 py-0.5 bg-background rounded text-xs">/shortcut</kbd> to insert • Use ↑↓ to navigate • Enter to select
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredShortcuts.map((reply, index) => (
              <button
                key={reply.id}
                onClick={() => handleShortcutSelect(reply)}
                className={cn(
                  "w-full text-left px-3 py-2 flex items-center justify-between hover:bg-muted transition-colors",
                  index === selectedShortcutIndex && "bg-muted"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{reply.title}</span>
                    {reply.shortcut && (
                      <span className="text-xs text-primary font-mono">/{reply.shortcut}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {reply.content}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              onTyping?.();
            }}
            onKeyDown={handleKeyDown}
            placeholder={isInternal ? 'Write an internal note...' : 'Type a message or /shortcut... (⌘+Enter to send)'}
            className="min-h-[44px] max-h-[150px] resize-none pr-24"
            rows={1}
          />
          
          <div className="absolute bottom-2 right-2 flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Insert emoji" className="h-7 w-7">
                  <Smile className="w-4 h-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Emoji</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Attach file" className="h-7 w-7">
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
                <Button variant="outline" size="icon" aria-label="Quick replies" className="h-11 w-11">
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
});

MessageInput.displayName = 'MessageInput';
