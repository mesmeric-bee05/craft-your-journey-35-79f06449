import { format } from 'date-fns';
import { AlertTriangle, Clock, User, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SLABreachLog } from '@/hooks/useSLATracking';

interface SLABreachTableProps {
  breaches: SLABreachLog[];
}

export function SLABreachTable({ breaches }: SLABreachTableProps) {
  const getBreachTypeBadge = (type: string) => {
    if (type === 'first_response') {
      return <Badge variant="destructive">First Response</Badge>;
    }
    return <Badge variant="secondary">Resolution</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
      urgent: 'destructive',
      high: 'default',
      normal: 'secondary',
      low: 'outline',
    };
    return <Badge variant={variants[priority] || 'secondary'}>{priority}</Badge>;
  };

  const getChannelIcon = (channel: string) => {
    return <MessageSquare className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Recent SLA Breaches
        </CardTitle>
        <CardDescription>
          Conversations that exceeded SLA targets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {breaches.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No breaches recorded</p>
            <p className="text-sm">All conversations are within SLA targets</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Actual</TableHead>
                <TableHead>Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breaches.map((breach) => (
                <TableRow key={breach.id}>
                  <TableCell className="font-medium">
                    {format(new Date(breach.created_at), 'MMM d, HH:mm')}
                  </TableCell>
                  <TableCell>{getBreachTypeBadge(breach.breach_type)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getChannelIcon(breach.channel_type)}
                      <span className="capitalize">{breach.channel_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getPriorityBadge(breach.priority)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {breach.target_minutes} min
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-destructive font-medium">
                      <Clock className="w-3 h-3" />
                      {breach.actual_minutes} min
                    </div>
                  </TableCell>
                  <TableCell className="text-destructive font-medium">
                    +{breach.actual_minutes - breach.target_minutes} min
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
