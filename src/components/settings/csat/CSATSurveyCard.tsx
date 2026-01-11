import { Star, Edit2, Trash2, Check, Clock, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { CSATSurvey } from '@/hooks/useCSATSurveys';

interface CSATSurveyCardProps {
  survey: CSATSurvey;
  onEdit: (survey: CSATSurvey) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onSetDefault: (id: string) => void;
}

export function CSATSurveyCard({
  survey,
  onEdit,
  onDelete,
  onToggleActive,
  onSetDefault,
}: CSATSurveyCardProps) {
  const scaleLabels = {
    '5-star': '5-Star Rating',
    emoji: 'Emoji Scale',
    nps: 'NPS (0-10)',
  };

  return (
    <Card className={`transition-all ${!survey.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{survey.name}</h3>
              {survey.is_default && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  Default
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{survey.question}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={survey.is_active}
              onCheckedChange={(checked) => onToggleActive(survey.id, checked)}
            />
            <Button variant="ghost" size="icon" onClick={() => onEdit(survey)}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(survey.id)}
              disabled={survey.is_default}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            <span>{scaleLabels[survey.scale_type]}</span>
          </div>
          {survey.trigger_on_resolution && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>
                {survey.delay_minutes > 0
                  ? `Trigger after ${survey.delay_minutes} min`
                  : 'Trigger immediately'}
              </span>
            </div>
          )}
          {survey.include_comment && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>Includes comment</span>
            </div>
          )}
        </div>
        {!survey.is_default && survey.is_active && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => onSetDefault(survey.id)}
          >
            Set as Default
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
