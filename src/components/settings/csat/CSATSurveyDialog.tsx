import { useState, useEffect } from 'react';
import { Star, Smile, BarChart3 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CSATSurvey } from '@/hooks/useCSATSurveys';

interface CSATSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  survey?: CSATSurvey | null;
  onSave: (survey: Partial<CSATSurvey>) => void;
}

export function CSATSurveyDialog({
  open,
  onOpenChange,
  survey,
  onSave,
}: CSATSurveyDialogProps) {
  const [formData, setFormData] = useState<Partial<CSATSurvey>>({
    name: '',
    question: 'How satisfied were you with our support?',
    scale_type: '5-star',
    is_active: true,
    trigger_on_resolution: true,
    delay_minutes: 0,
    include_comment: true,
    comment_prompt: 'Any additional feedback?',
    thank_you_message: 'Thank you for your feedback!',
  });

  useEffect(() => {
    if (survey) {
      setFormData(survey);
    } else {
      setFormData({
        name: '',
        question: 'How satisfied were you with our support?',
        scale_type: '5-star',
        is_active: true,
        trigger_on_resolution: true,
        delay_minutes: 0,
        include_comment: true,
        comment_prompt: 'Any additional feedback?',
        thank_you_message: 'Thank you for your feedback!',
      });
    }
  }, [survey, open]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const scaleOptions = [
    { value: '5-star', label: '5-Star Rating', icon: Star },
    { value: 'emoji', label: 'Emoji Scale', icon: Smile },
    { value: 'nps', label: 'NPS (0-10)', icon: BarChart3 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {survey ? 'Edit Survey' : 'Create CSAT Survey'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Survey Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="e.g., Post-Support Survey"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="question">Survey Question</Label>
            <Textarea
              id="question"
              value={formData.question}
              onChange={(e) =>
                setFormData({ ...formData, question: e.target.value })
              }
              placeholder="How satisfied were you with our support?"
            />
          </div>

          <div className="space-y-2">
            <Label>Rating Scale</Label>
            <Select
              value={formData.scale_type}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  scale_type: value as '5-star' | 'emoji' | 'nps',
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scaleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="w-4 h-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Trigger on Resolution</Label>
              <p className="text-xs text-muted-foreground">
                Automatically send when conversation is resolved
              </p>
            </div>
            <Switch
              checked={formData.trigger_on_resolution}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, trigger_on_resolution: checked })
              }
            />
          </div>

          {formData.trigger_on_resolution && (
            <div className="space-y-2">
              <Label htmlFor="delay">Delay (minutes)</Label>
              <Input
                id="delay"
                type="number"
                min={0}
                value={formData.delay_minutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delay_minutes: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Include Comment Field</Label>
              <p className="text-xs text-muted-foreground">
                Allow customers to leave additional feedback
              </p>
            </div>
            <Switch
              checked={formData.include_comment}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, include_comment: checked })
              }
            />
          </div>

          {formData.include_comment && (
            <div className="space-y-2">
              <Label htmlFor="comment_prompt">Comment Prompt</Label>
              <Input
                id="comment_prompt"
                value={formData.comment_prompt}
                onChange={(e) =>
                  setFormData({ ...formData, comment_prompt: e.target.value })
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="thank_you">Thank You Message</Label>
            <Input
              id="thank_you"
              value={formData.thank_you_message}
              onChange={(e) =>
                setFormData({ ...formData, thank_you_message: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name}>
            {survey ? 'Save Changes' : 'Create Survey'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
