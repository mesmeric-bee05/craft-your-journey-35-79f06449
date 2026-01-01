import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, MapPin, Clock, Users, Calendar } from 'lucide-react';
import { JobPosting } from '@/hooks/useJobPostings';
import { formatDistanceToNow } from 'date-fns';

interface JobPostingCardProps {
  job: JobPosting;
  onViewDetails: (job: JobPosting) => void;
  onApply?: (job: JobPosting) => void;
  isOwner?: boolean;
  onEdit?: (job: JobPosting) => void;
}

export function JobPostingCard({ job, onViewDetails, onApply, isOwner, onEdit }: JobPostingCardProps) {
  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    open: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  const jobTypeLabels: Record<string, string> = {
    one_time: 'One-time',
    ongoing: 'Ongoing',
    full_time: 'Full-time',
    part_time: 'Part-time',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{job.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>{jobTypeLabels[job.job_type]}</span>
              <span>•</span>
              <MapPin className="h-4 w-4" />
              <span className="capitalize">{job.location_type}</span>
            </div>
          </div>
          <Badge className={statusColors[job.status]}>
            {job.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {job.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
        )}

        <div className="flex flex-wrap gap-1">
          {job.skills_required.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
          {job.skills_required.length > 4 && (
            <Badge variant="secondary" className="text-xs">
              +{job.skills_required.length - 4}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="space-y-1">
            <div className="font-semibold">
              {job.budget_min && job.budget_max ? (
                <span>
                  {job.currency} {job.budget_min.toLocaleString()} - {job.budget_max.toLocaleString()}
                  {job.budget_type === 'hourly' && '/hr'}
                </span>
              ) : job.budget_min || job.budget_max ? (
                <span>
                  {job.currency} {(job.budget_min || job.budget_max)?.toLocaleString()}
                  {job.budget_type === 'hourly' && '/hr'}
                </span>
              ) : (
                <span className="text-muted-foreground">Budget not specified</span>
              )}
            </div>
            {job.duration && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {job.duration}
              </div>
            )}
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-4 w-4" />
              {job.applications_count} applicants
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onViewDetails(job)}>
            View Details
          </Button>
          {isOwner && onEdit ? (
            <Button className="flex-1" onClick={() => onEdit(job)}>
              Edit
            </Button>
          ) : onApply && job.status === 'open' ? (
            <Button className="flex-1" onClick={() => onApply(job)}>
              Apply Now
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
