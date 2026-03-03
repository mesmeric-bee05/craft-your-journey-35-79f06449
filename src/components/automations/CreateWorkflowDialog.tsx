import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const workflowSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  trigger_type: z.enum(['manual', 'scheduled', 'event', 'segment_entry']),
});

type FormValues = z.infer<typeof workflowSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: { name: string; description?: string; trigger_type: string }) => Promise<string | null>;
}

export function CreateWorkflowDialog({ open, onOpenChange, onCreate }: Props) {
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: { name: '', description: '', trigger_type: 'manual' },
  });

  const onSubmit = async (values: FormValues) => {
    await onCreate({ name: values.name, description: values.description, trigger_type: values.trigger_type });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Automation</DialogTitle>
          <DialogDescription>Set up a new automated workflow for your business.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Workflow Name *</Label>
            <Input {...register('name')} placeholder="e.g., Welcome new customers" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register('description')} placeholder="What does this automation do?" rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Trigger Type *</Label>
            <Select defaultValue="manual" onValueChange={(v) => setValue('trigger_type', v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual — Run on demand</SelectItem>
                <SelectItem value="scheduled">Scheduled — Run on a schedule</SelectItem>
                <SelectItem value="event">Event — Triggered by an action</SelectItem>
                <SelectItem value="segment_entry">Segment Entry — When customer enters a segment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Workflow'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
