import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, MessageSquare, Pin, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLiveChatMessages, LiveChatMessage } from '@/hooks/useLiveChatMessages';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface LiveChatProps {
  streamId?: string;
  isStreaming: boolean;
  isOwner?: boolean;
}

export function LiveChat({ streamId, isStreaming, isOwner = true }: LiveChatProps) {
  const { user } = useAuth();
  const {
    messages,
    loading,
    pinnedMessage,
    sendMessage,
    pinMessage,
    unpinMessage,
    deleteMessage,
  } = useLiveChatMessages({ streamId: streamId || null, isStreaming });

  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessage(newMessage.trim());
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const renderMessage = (msg: LiveChatMessage, isPinned = false) => {
    const isOwnMessage = msg.user_id === user?.id;

    return (
      <div 
        key={msg.id} 
        className={cn(
          'flex gap-2 group',
          isPinned && 'bg-primary/5 p-2 rounded-lg border border-primary/20'
        )}
      >
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {getInitials(msg.user_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'font-medium text-sm truncate',
              isOwnMessage && 'text-primary'
            )}>
              {msg.user_name}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(msg.created_at), 'HH:mm')}
            </span>
            {isPinned && (
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                <Pin className="w-2 h-2 mr-1" />
                Pinned
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground break-words">
            {msg.message}
          </p>
        </div>
        
        {/* Moderation Actions */}
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {msg.is_pinned ? (
                <DropdownMenuItem onClick={() => unpinMessage(msg.id)}>
                  <Pin className="w-4 h-4 mr-2" />
                  Unpin
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => pinMessage(msg.id)}>
                  <Pin className="w-4 h-4 mr-2" />
                  Pin Message
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => deleteMessage(msg.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Live Chat
          {isStreaming && messages.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {messages.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Pinned Message */}
        {pinnedMessage && (
          <div className="px-4 pb-2 border-b">
            {renderMessage(pinnedMessage, true)}
          </div>
        )}

        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {isStreaming 
                  ? 'No messages yet. Start chatting!'
                  : 'Chat will be available when stream starts'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {messages
                .filter(m => m.id !== pinnedMessage?.id)
                .map((msg) => renderMessage(msg))}
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder={isStreaming ? "Send a message..." : "Chat disabled"}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!isStreaming}
              className="flex-1"
            />
            <Button 
              size="icon" 
              onClick={handleSendMessage}
              disabled={!isStreaming || !newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
