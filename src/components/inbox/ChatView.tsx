import { useState, RefObject } from 'react';
import { ArrowLeft, MoreVertical, User, CheckCircle, Clock, Archive, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageBubble } from './MessageBubble';
import { MessageInput, MessageInputRef } from './MessageInput';
import { AISuggestions } from './AISuggestions';
import { AssignmentDropdown } from './AssignmentDropdown';
import { SLABadge } from './SLABadge';
import { CSATSurveyWidget } from './CSATSurveyWidget';
import { TypingIndicator } from './TypingIndicator';
import { Conversation } from '@/hooks/useConversations';
import { useMessages } from '@/hooks/useMessages';
import { useTypingIndicators } from '@/hooks/useTypingIndicators';
import { getChannelConfig } from './channelConfig';
import { cn } from '@/lib/utils';
interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
  onToggleDetails: () => void;
  onStatusChange: (id: string, status: Conversation['status']) => void;
  onAssign: (id: string, userId: string | null) => void;
  messageInputRef?: RefObject<MessageInputRef>;
}

export function ChatView({ conversation, onBack, onToggleDetails, onStatusChange, onAssign, messageInputRef }: ChatViewProps) {
  const { messages, loading, sendMessage } = useMessages(conversation.id);
  const { typingUsers, setTyping, clearTyping } = useTypingIndicators({ conversationId: conversation.id });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCSATSurvey, setShowCSATSurvey] = useState(conversation.status === 'resolved');
  const { customer, channel_type } = conversation;
  const channelConfig = getChannelConfig(channel_type);
  const ChannelIcon = channelConfig.icon;
  
  const customerName = customer?.name || customer?.phone || customer?.email || 'Unknown';
  const initials = customerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSendMessage = async (content: string, isInternal: boolean) => {
    clearTyping();
    await sendMessage(content, isInternal);
    setShowSuggestions(false);
  };

  const handleTyping = () => {
    setTyping(true);
  };

  const handleUseSuggestion = (suggestion: string) => {
    handleSendMessage(suggestion, false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="relative">
          <Avatar className="w-10 h-10">
            <AvatarImage src={customer?.avatar_url || undefined} />
            <AvatarFallback className="bg-muted text-muted-foreground">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{customerName}</h3>
            {conversation.status !== 'archived' && (
              <SLABadge conversationId={conversation.id} />
            )}
          </div>
          <p className="text-sm text-muted-foreground capitalize">via {channel_type}</p>
        </div>

        <div className="flex items-center gap-2">
          <AssignmentDropdown
            currentAssignee={conversation.assigned_to}
            onAssign={(userId) => onAssign(conversation.id, userId)}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="gap-1"
          >
            <Sparkles className="w-4 h-4" />
            AI Suggest
          </Button>

          <Button variant="ghost" size="icon" onClick={onToggleDetails} className="hidden lg:flex">
            <User className="w-5 h-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange(conversation.id, 'open')}>
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Mark as Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(conversation.id, 'pending')}>
                <Clock className="w-4 h-4 mr-2 text-yellow-500" />
                Mark as Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(conversation.id, 'resolved')}>
                <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                Mark as Resolved
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onStatusChange(conversation.id, 'archived')}>
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* AI Suggestions */}
      {showSuggestions && (
        <AISuggestions
          messages={messages}
          customerName={customerName}
          onUseSuggestion={handleUseSuggestion}
          onClose={() => setShowSuggestions(false)}
        />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {loading ? (
            <div className="text-center text-muted-foreground">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages in this conversation yet.</p>
              <p className="text-sm mt-1">Send a message to start the conversation.</p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>
        
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <TypingIndicator typingUsers={typingUsers} />
        )}
      </ScrollArea>

      {/* CSAT Survey Widget - Shows when conversation is resolved */}
      {showCSATSurvey && conversation.status === 'resolved' && (
        <CSATSurveyWidget
          conversationId={conversation.id}
          customerId={conversation.customer_id}
          channelType={conversation.channel_type}
          assignedAgentId={conversation.assigned_to}
          onClose={() => setShowCSATSurvey(false)}
          onSubmit={() => setShowCSATSurvey(false)}
        />
      )}

      {/* Message Input */}
      <MessageInput 
        ref={messageInputRef} 
        onSend={handleSendMessage} 
        conversationId={conversation.id}
        onTyping={handleTyping}
      />
    </div>
  );
}
