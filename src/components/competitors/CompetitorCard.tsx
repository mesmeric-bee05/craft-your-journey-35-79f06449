import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Trash2, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Competitor {
  id: string;
  name: string;
  website?: string | null;
  industry?: string | null;
  social_handles?: Record<string, string>;
  swot?: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  metrics?: Record<string, any>;
  is_active?: boolean;
}

interface CompetitorCardProps {
  competitor: Competitor;
  onDelete?: (id: string) => void;
}

function MomentumRing({ value }: { value: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? 'text-green-500' : value >= 40 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
        <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
        <circle
          cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="3"
          className={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-foreground">{value}</span>
    </div>
  );
}

function getGrowthStatus(momentum: number) {
  if (momentum >= 75) return { label: 'Surging', color: 'bg-green-500/10 text-green-700 dark:text-green-300' };
  if (momentum >= 50) return { label: 'Growing', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' };
  if (momentum >= 30) return { label: 'Stable', color: 'bg-gray-500/10 text-gray-700 dark:text-gray-300' };
  return { label: 'Declining', color: 'bg-red-500/10 text-red-700 dark:text-red-300' };
}

export function CompetitorCard({ competitor, onDelete }: CompetitorCardProps) {
  const swot = competitor.swot || { strengths: [], weaknesses: [], opportunities: [], threats: [] };
  const handles = competitor.social_handles || {};

  // Derive momentum from metrics or generate a consistent mock value
  const momentum = (competitor.metrics as any)?.momentum ??
    (competitor.name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 60 + 30);
  const growth = getGrowthStatus(momentum);

  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <MomentumRing value={momentum} />
            <div>
              <CardTitle className="text-base">{competitor.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {competitor.industry && (
                  <Badge variant="secondary" className="text-xs">{competitor.industry}</Badge>
                )}
                <Badge className={`text-[10px] border-0 ${growth.color}`}>
                  {growth.label}
                </Badge>
              </div>
            </div>
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
