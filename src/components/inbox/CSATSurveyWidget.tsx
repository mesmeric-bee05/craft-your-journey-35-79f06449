import { useState, useEffect } from 'react';
import { Star, Send, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const csatSchema = z.object({
  rating: z.number().int().min(1, 'Rating is required').max(11),
  comment: z.string().max(1000, 'Max 1000 characters').optional().or(z.literal('')),
});

interface CSATSurveyWidgetProps {
  conversationId: string;
  customerId: string;
  channelType: string;
  assignedAgentId?: string | null;
  onClose?: () => void;
  onSubmit?: () => void;
}

interface CSATSurvey {
  id: string;
  name: string;
  question: string;
  scale_type: string;
  include_comment: boolean;
  comment_prompt: string | null;
  thank_you_message: string | null;
}

export function CSATSurveyWidget({
  conversationId,
  customerId,
  channelType,
  assignedAgentId,
  onClose,
  onSubmit,
}: CSATSurveyWidgetProps) {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [survey, setSurvey] = useState<CSATSurvey | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [alreadyResponded, setAlreadyResponded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSurveyAndCheckResponse = async () => {
      if (!business?.id) return;

      try {
        const { data: existingResponse } = await supabase
          .from('csat_responses')
          .select('id')
          .eq('conversation_id', conversationId)
          .maybeSingle();

        if (existingResponse) {
          setAlreadyResponded(true);
          setLoading(false);
          return;
        }

        const { data: surveyData, error } = await supabase
          .from('csat_surveys')
          .select('*')
          .eq('business_id', business.id)
          .eq('is_active', true)
          .eq('is_default', true)
          .maybeSingle();

        if (error) throw error;

        if (surveyData) {
          setSurvey(surveyData as CSATSurvey);
        } else {
          const { data: anySurvey } = await supabase
            .from('csat_surveys')
            .select('*')
            .eq('business_id', business.id)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();

          if (anySurvey) setSurvey(anySurvey as CSATSurvey);
        }
      } catch (err) {
        logger.error('Error fetching CSAT survey', err, { component: 'CSATSurveyWidget', conversationId });
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyAndCheckResponse();
  }, [business?.id, conversationId]);

  const handleSubmit = async () => {
    if (!survey || !business?.id || rating === 0) return;

    const validation = csatSchema.safeParse({ rating, comment });
    if (!validation.success) {
      toast({ title: 'Invalid input', description: validation.error.errors[0]?.message, variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('csat_responses').insert({
        business_id: business.id,
        survey_id: survey.id,
        conversation_id: conversationId,
        customer_id: customerId,
        assigned_agent_id: assignedAgentId,
        rating: validation.data.rating,
        channel_type: channelType,
        comment: validation.data.comment?.trim() || null,
      } as any);

      if (error) throw error;

      setIsSubmitted(true);
      toast({ title: 'Feedback submitted!', description: 'Thank you for your response.' });
      onSubmit?.();
    } catch (err: any) {
      toast({ title: 'Error submitting feedback', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || alreadyResponded || !survey) return null;

  if (isSubmitted) {
    return (
      <Card className="mx-4 mb-4 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-800 dark:text-green-200">
                {survey.thank_you_message || 'Thank you for your feedback!'}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayRating = hoveredRating || rating;

  return (
    <Card className="mx-4 mb-4 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Star className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium text-sm">Quick Survey</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-sm mb-4">{survey.question}</p>

        {survey.scale_type === '5-star' && (
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)} onMouseEnter={() => setHoveredRating(star)} onMouseLeave={() => setHoveredRating(0)} className="p-1 transition-transform hover:scale-110">
                <Star className={cn('w-8 h-8 transition-colors', star <= displayRating ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-muted-foreground')} />
              </button>
            ))}
            {rating > 0 && <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>}
          </div>
        )}

        {survey.scale_type === 'emoji' && (
          <div className="flex items-center gap-2 mb-4">
            {[
              { value: 1, emoji: '😠', label: 'Very Unhappy' },
              { value: 2, emoji: '😟', label: 'Unhappy' },
              { value: 3, emoji: '😐', label: 'Neutral' },
              { value: 4, emoji: '😊', label: 'Happy' },
              { value: 5, emoji: '😍', label: 'Very Happy' },
            ].map((option) => (
              <button key={option.value} onClick={() => setRating(option.value)} className={cn('text-3xl p-2 rounded-lg transition-all', rating === option.value ? 'bg-primary/20 scale-110' : 'hover:bg-muted opacity-60 hover:opacity-100')} title={option.label}>
                {option.emoji}
              </button>
            ))}
          </div>
        )}

        {survey.scale_type === 'nps' && (
          <div className="flex flex-wrap gap-1 mb-4">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
              <button key={score} onClick={() => setRating(score + 1)} className={cn('w-8 h-8 rounded text-sm font-medium transition-all', rating === score + 1 ? score <= 6 ? 'bg-red-500 text-white' : score <= 8 ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white' : 'bg-muted hover:bg-muted/80')}>
                {score}
              </button>
            ))}
            <div className="w-full flex justify-between text-xs text-muted-foreground mt-1">
              <span>Not likely</span>
              <span>Very likely</span>
            </div>
          </div>
        )}

        {survey.include_comment && rating > 0 && (
          <div className="mb-4">
            <Textarea
              placeholder={survey.comment_prompt || 'Any additional feedback?'}
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              className="min-h-[60px] text-sm"
              maxLength={1000}
            />
          </div>
        )}

        <Button onClick={handleSubmit} disabled={rating === 0 || isSubmitting} size="sm" className="w-full">
          <Send className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
}
