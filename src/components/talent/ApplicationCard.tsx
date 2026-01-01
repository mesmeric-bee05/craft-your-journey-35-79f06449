import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, DollarSign } from 'lucide-react';
import { JobApplication } from '@/hooks/useJobApplications';
import { FreelancerProfile } from '@/hooks/useFreelancers';
import { formatDistanceToNow } from 'date-fns';

interface ApplicationCardProps {
  application: JobApplication;
  freelancer?: FreelancerProfile;
  onAccept?: (application: JobApplication) => void;
  onReject?: (application: JobApplication) => void;
  onShortlist?: (application: JobApplication) => void;
}

export function ApplicationCard({ 
  application, 
  freelancer, 
  onAccept, 
  onReject, 
  onShortlist 
}: ApplicationCardProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    shortlisted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    withdrawn: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(freelancer?.headline || 'A')}&background=random`} />
              <AvatarFallback>{freelancer?.headline?.[0] || 'A'}</AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-medium">{freelancer?.headline || 'Freelancer'}</h4>
              <p className="text-sm text-muted-foreground">
                Applied {formatDistanceToNow(new Date(application.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge className={statusColors[application.status]}>
            {application.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {application.cover_letter && (
          <p className="text-sm text-muted-foreground line-clamp-3">{application.cover_letter}</p>
        )}

        <div className="flex items-center gap-4 text-sm">
          {application.proposed_rate && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {application.proposed_rate.toLocaleString()}
            </span>
          )}
          {application.proposed_duration && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              {application.proposed_duration}
            </span>
          )}
        </div>

        {application.status === 'pending' && (
          <div className="flex gap-2">
            {onShortlist && (
              <Button variant="outline" size="sm" onClick={() => onShortlist(application)}>
                Shortlist
              </Button>
            )}
            {onAccept && (
              <Button size="sm" onClick={() => onAccept(application)}>
                Accept
              </Button>
            )}
            {onReject && (
              <Button variant="destructive" size="sm" onClick={() => onReject(application)}>
                Reject
              </Button>
            )}
          </div>
        )}

        {application.status === 'shortlisted' && (
          <div className="flex gap-2">
            {onAccept && (
              <Button size="sm" onClick={() => onAccept(application)}>
                Accept
              </Button>
            )}
            {onReject && (
              <Button variant="destructive" size="sm" onClick={() => onReject(application)}>
                Reject
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
