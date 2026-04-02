import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Trash2, ExternalLink, Edit2 } from 'lucide-react';

interface Competitor {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  social_handles?: Record<string, string>;
  swot?: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  is_active?: boolean;
}

interface CompetitorCardProps {
  competitor: Competitor;
  onDelete?: (id: string) => void;
}

export function CompetitorCard({ competitor, onDelete }: CompetitorCardProps) {
  const swot = competitor.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] };
  const handles = competitor.social_handles || {};

  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{competitor.name}</CardTitle>
            {competitor.industry && (
              <Badge variant="secondary" className="mt-1 text-xs">{competitor.industry}</Badge>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {competitor.website && (
              <Button variant="ghost" size="icon" asChild>
                <a href={competitor.website} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(competitor.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Social handles */}
        {Object.keys(handles).length > 0 && (
          <div className="flex flex-wrap gap-1">
            {Object.entries(handles).map(([platform, handle]) => (
              <Badge key={platform} variant="outline" className="text-xs">
                {platform}: {handle as string}
              </Badge>
            ))}
          </div>
        )}

        {/* SWOT mini-summary */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {swot.strengths.length > 0 && (
            <div className="p-2 rounded bg-green-500/10 text-green-700 dark:text-green-300">
              <span className="font-semibold">S:</span> {swot.strengths.slice(0, 2).join(', ')}
            </div>
          )}
          {swot.weaknesses.length > 0 && (
            <div className="p-2 rounded bg-red-500/10 text-red-700 dark:text-red-300">
              <span className="font-semibold">W:</span> {swot.weaknesses.slice(0, 2).join(', ')}
            </div>
          )}
          {swot.opportunities.length > 0 && (
            <div className="p-2 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
              <span className="font-semibold">O:</span> {swot.opportunities.slice(0, 2).join(', ')}
            </div>
          )}
          {swot.threats.length > 0 && (
            <div className="p-2 rounded bg-orange-500/10 text-orange-700 dark:text-orange-300">
              <span className="font-semibold">T:</span> {swot.threats.slice(0, 2).join(', ')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
