import { X, Mail, Phone, Tag, Calendar, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Customer, Conversation } from '@/hooks/useConversations';
import { getChannelConfig } from './channelConfig';
import { cn } from '@/lib/utils';

interface CustomerDetailsProps {
  customer?: Customer;
  conversation: Conversation;
  onClose: () => void;
}

export function CustomerDetails({ customer, conversation, onClose }: CustomerDetailsProps) {
  const channelConfig = getChannelConfig(conversation.channel_type);
  const ChannelIcon = channelConfig.icon;

  const customerName = customer?.name || customer?.phone || customer?.email || 'Unknown';
  const initials = customerName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">Customer Details</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Profile */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="w-20 h-20 mb-3">
              <AvatarImage src={customer?.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <h4 className="font-semibold text-lg">{customerName}</h4>
            <div className={cn(
              'flex items-center gap-1 mt-1 px-2 py-1 rounded-full text-sm',
              channelConfig.bgColor
            )}>
              <ChannelIcon className={cn('w-4 h-4', channelConfig.color)} />
              <span className={channelConfig.color}>{conversation.channel_type}</span>
            </div>
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-muted-foreground">Contact Information</h5>
            
            {customer?.email && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm truncate">{customer.email}</p>
                </div>
              </div>
            )}

            {customer?.phone && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm">{customer.phone}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-medium text-muted-foreground">Tags</h5>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                + Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {customer?.tags && customer.tags.length > 0 ? (
                customer.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tags added</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Conversation Stats */}
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-muted-foreground">Conversation Info</h5>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">First Contact</p>
                <p className="text-sm">
                  {format(new Date(conversation.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm capitalize">{conversation.status}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {customer?.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-muted-foreground">Notes</h5>
                <p className="text-sm text-muted-foreground">{customer.notes}</p>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
