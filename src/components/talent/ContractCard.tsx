import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Calendar, DollarSign } from 'lucide-react';
import { Contract } from '@/hooks/useContracts';
import { format } from 'date-fns';

interface ContractCardProps {
  contract: Contract;
  onViewDetails: (contract: Contract) => void;
  onUpdateStatus?: (contract: Contract, status: Contract['status']) => void;
}

export function ContractCard({ contract, onViewDetails, onUpdateStatus }: ContractCardProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    disputed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {contract.title}
            </CardTitle>
          </div>
          <Badge className={statusColors[contract.status]}>
            {contract.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {contract.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{contract.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Rate</div>
            <div className="font-semibold flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {contract.currency} {contract.rate.toLocaleString()}
              {contract.rate_type === 'hourly' && '/hr'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Total Paid</div>
            <div className="font-semibold">
              {contract.currency} {contract.total_paid.toLocaleString()}
            </div>
          </div>
        </div>

        {(contract.start_date || contract.end_date) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {contract.start_date && format(new Date(contract.start_date), 'MMM d, yyyy')}
              {contract.start_date && contract.end_date && ' - '}
              {contract.end_date && format(new Date(contract.end_date), 'MMM d, yyyy')}
            </span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onViewDetails(contract)}>
            View Details
          </Button>
          {contract.status === 'pending' && onUpdateStatus && (
            <Button className="flex-1" onClick={() => onUpdateStatus(contract, 'active')}>
              Start Contract
            </Button>
          )}
          {contract.status === 'active' && onUpdateStatus && (
            <Button className="flex-1" onClick={() => onUpdateStatus(contract, 'completed')}>
              Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
