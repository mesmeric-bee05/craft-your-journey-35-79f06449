import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Mail, Phone, MessageSquare, Trash2, Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Customer } from '@/hooks/useCustomers';

const channelColors: Record<string, string> = {
  whatsapp: 'bg-green-500/10 text-green-700 border-green-200',
  instagram: 'bg-pink-500/10 text-pink-700 border-pink-200',
  facebook: 'bg-blue-500/10 text-blue-700 border-blue-200',
  twitter: 'bg-sky-500/10 text-sky-700 border-sky-200',
  email: 'bg-amber-500/10 text-amber-700 border-amber-200',
  sms: 'bg-purple-500/10 text-purple-700 border-purple-200',
  telegram: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  tiktok: 'bg-slate-500/10 text-slate-700 border-slate-200',
};

interface CustomerCardProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onViewConversations: (customer: Customer) => void;
}

export function CustomerCard({ customer, onEdit, onDelete, onViewConversations }: CustomerCardProps) {
  const initials = (customer.name || 'U')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={customer.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground truncate">
              {customer.name || 'Unknown'}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(customer)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewConversations(customer)}>
                  <MessageSquare className="h-4 w-4 mr-2" /> View Conversations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(customer.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            {customer.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{customer.email}</span>
              </span>
            )}
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" />
                {customer.phone}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className={channelColors[customer.channel_type] || 'bg-muted'}>
              {customer.channel_type}
            </Badge>
            {(customer.tags || []).slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {(customer.tags || []).length > 3 && (
              <Badge variant="secondary" className="text-xs">+{customer.tags.length - 3}</Badge>
            )}
          </div>

          {customer.last_contact_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Last contact {formatDistanceToNow(new Date(customer.last_contact_at), { addSuffix: true })}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
