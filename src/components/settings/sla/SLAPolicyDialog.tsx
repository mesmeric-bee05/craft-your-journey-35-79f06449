import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { SLAPolicy, SLAPolicyInsert } from '@/hooks/useSLAPolicies';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  first_response_target: z.number().min(1).max(10080), // 1 min to 7 days
  resolution_target: z.number().min(1).max(43200), // 1 min to 30 days
  warning_threshold: z.number().min(50).max(95),
  is_active: z.boolean(),
  is_default: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface SLAPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: SLAPolicy | null;
  onSave: (policy: Omit<SLAPolicyInsert, 'business_id'>) => Promise<void>;
}

export function SLAPolicyDialog({ 
  open, 
  onOpenChange, 
  policy, 
  onSave 
}: SLAPolicyDialogProps) {
  const isEditing = !!policy;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      first_response_target: 60,
      resolution_target: 1440,
      warning_threshold: 80,
      is_active: true,
      is_default: false,
    },
  });

  useEffect(() => {
    if (policy) {
      form.reset({
        name: policy.name,
        description: policy.description || '',
        first_response_target: policy.first_response_target,
        resolution_target: policy.resolution_target,
        warning_threshold: policy.warning_threshold,
        is_active: policy.is_active,
        is_default: policy.is_default,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        first_response_target: 60,
        resolution_target: 1440,
        warning_threshold: 80,
        is_active: true,
        is_default: false,
      });
    }
  }, [policy, form]);

  const handleSubmit = async (values: FormValues) => {
    await onSave({
      name: values.name,
      description: values.description || null,
      first_response_target: values.first_response_target,
      resolution_target: values.resolution_target,
      warning_threshold: values.warning_threshold,
      is_active: values.is_active,
      is_default: values.is_default,
      priority_overrides: policy?.priority_overrides || {},
      channel_overrides: policy?.channel_overrides || {},
      business_hours: policy?.business_hours || null,
    });
    onOpenChange(false);
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit SLA Policy' : 'Create SLA Policy'}
          </DialogTitle>
          <DialogDescription>
            Define response and resolution time targets for conversations.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Standard SLA" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe when this policy should be used..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="first_response_target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Response Target</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Slider
                        min={5}
                        max={480}
                        step={5}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>5 min</span>
                        <span className="font-medium text-foreground">
                          {formatTime(field.value)}
                        </span>
                        <span>8 hours</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Time to first agent response after customer message
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resolution_target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resolution Target</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Slider
                        min={60}
                        max={10080}
                        step={60}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>1 hour</span>
                        <span className="font-medium text-foreground">
                          {formatTime(field.value)}
                        </span>
                        <span>7 days</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Total time from first message to resolution
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="warning_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Warning Threshold</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Slider
                        min={50}
                        max={95}
                        step={5}
                        value={[field.value]}
                        onValueChange={(value) => field.onChange(value[0])}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>50%</span>
                        <span className="font-medium text-foreground">
                          {field.value}%
                        </span>
                        <span>95%</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Send warning notification at this percentage of target time
                  </FormDescription>
                </FormItem>
              )}
            />

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Active</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Set as Default</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Policy'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
