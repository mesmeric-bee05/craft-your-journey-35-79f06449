import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, Clock, CheckCircle } from 'lucide-react';
import { FreelancerProfile } from '@/hooks/useFreelancers';

interface FreelancerCardProps {
  freelancer: FreelancerProfile;
  onViewProfile: (freelancer: FreelancerProfile) => void;
  onHire?: (freelancer: FreelancerProfile) => void;
}

export function FreelancerCard({ freelancer, onViewProfile, onHire }: FreelancerCardProps) {
  const availabilityColors = {
    available: 'bg-green-500',
    busy: 'bg-yellow-500',
    unavailable: 'bg-red-500',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(freelancer.headline || 'F')}&background=random`} />
            <AvatarFallback>{freelancer.headline?.[0] || 'F'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{freelancer.headline || 'Freelancer'}</h3>
              {freelancer.is_verified && (
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              {freelancer.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {freelancer.location}
                </span>
              )}
              <span className={`h-2 w-2 rounded-full ${availabilityColors[freelancer.availability]}`} />
              <span className="capitalize">{freelancer.availability}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {freelancer.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{freelancer.bio}</p>
        )}
        
        <div className="flex flex-wrap gap-1">
          {freelancer.skills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {freelancer.skills.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{freelancer.skills.length - 4} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              {freelancer.rating.toFixed(1)}
            </span>
            <span className="text-muted-foreground">
              {freelancer.total_jobs} jobs
            </span>
          </div>
          {freelancer.hourly_rate && (
            <span className="font-semibold">
              {freelancer.currency} {freelancer.hourly_rate}/hr
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{freelancer.experience_years} years experience</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onViewProfile(freelancer)}>
            View Profile
          </Button>
          {onHire && freelancer.availability === 'available' && (
            <Button className="flex-1" onClick={() => onHire(freelancer)}>
              Hire
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
