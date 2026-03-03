import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Users, UserPlus, MessageSquare, Tag } from 'lucide-react';
import type { Customer } from '@/hooks/useCustomers';

interface Props {
  customers: Customer[];
}

export function CustomerStats({ customers }: Props) {
  const total = customers.length;
  const withEmail = customers.filter(c => c.email).length;
  const channels = new Set(customers.map(c => c.channel_type)).size;
  const totalTags = new Set(customers.flatMap(c => c.tags || [])).size;

  const stats = [
    { label: 'Total Customers', value: total, icon: Users, color: 'text-primary' },
    { label: 'With Email', value: withEmail, icon: UserPlus, color: 'text-success' },
    { label: 'Active Channels', value: channels, icon: MessageSquare, color: 'text-accent' },
    { label: 'Unique Tags', value: totalTags, icon: Tag, color: 'text-warning' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardHeader className="pb-2">
            <CardDescription>{label}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Icon className={`h-5 w-5 ${color}`} />
            <span className="text-2xl font-bold text-foreground">{value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
