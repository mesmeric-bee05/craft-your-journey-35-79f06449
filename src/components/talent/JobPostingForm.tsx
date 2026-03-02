import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { JobPosting, useJobPostings } from '@/hooks/useJobPostings';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const jobPostingSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Max 200 characters'),
  description: z.string().max(5000, 'Max 5000 characters').optional().or(z.literal('')),
  job_type: z.enum(['one_time', 'ongoing', 'full_time', 'part_time']),
  budget_type: z.enum(['fixed', 'hourly']),
  budget_min: z.string().optional().or(z.literal('')),
  budget_max: z.string().optional().or(z.literal('')),
  currency: z.string().default('KES'),
  duration: z.string().max(100, 'Max 100 characters').optional().or(z.literal('')),
  location_type: z.enum(['remote', 'onsite', 'hybrid']),
  status: z.enum(['draft', 'open']),
}).refine(data => {
  const min = data.budget_min ? parseFloat(data.budget_min) : null;
  const max = data.budget_max ? parseFloat(data.budget_max) : null;
  if (min !== null && max !== null && min > max) return false;
  return true;
}, { message: 'Min budget cannot exceed max budget', path: ['budget_min'] });

type JobFormValues = z.infer<typeof jobPostingSchema>;

interface JobPostingFormProps {
  open: boolean;
  onClose: () => void;
  editingJob?: JobPosting;
}

export function JobPostingForm({ open, onClose, editingJob }: JobPostingFormProps) {
  const { createJobPosting, updateJobPosting } = useJobPostings();
  const [skills, setSkills] = useState<string[]>(editingJob?.skills_required || []);
  const [skillInput, setSkillInput] = useState('');

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: {
      title: editingJob?.title || '',
      description: editingJob?.description || '',
      job_type: editingJob?.job_type || 'one_time',
      budget_type: editingJob?.budget_type || 'fixed',
      budget_min: editingJob?.budget_min?.toString() || '',
      budget_max: editingJob?.budget_max?.toString() || '',
      currency: editingJob?.currency || 'KES',
      duration: editingJob?.duration || '',
      location_type: editingJob?.location_type || 'remote',
      status: (editingJob?.status === 'draft' || editingJob?.status === 'open') ? editingJob.status : 'draft',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        title: editingJob?.title || '',
        description: editingJob?.description || '',
        job_type: editingJob?.job_type || 'one_time',
        budget_type: editingJob?.budget_type || 'fixed',
        budget_min: editingJob?.budget_min?.toString() || '',
        budget_max: editingJob?.budget_max?.toString() || '',
        currency: editingJob?.currency || 'KES',
        duration: editingJob?.duration || '',
        location_type: editingJob?.location_type || 'remote',
        status: (editingJob?.status === 'draft' || editingJob?.status === 'open') ? editingJob.status : 'draft',
      });
      setSkills(editingJob?.skills_required || []);
    }
  }, [open, editingJob]);

  const handleSubmit = async (values: JobFormValues) => {
    const payload = {
      ...values,
      skills_required: skills,
      budget_min: values.budget_min ? parseFloat(values.budget_min) : null,
      budget_max: values.budget_max ? parseFloat(values.budget_max) : null,
    };

    if (editingJob) {
      await updateJobPosting.mutateAsync({ id: editingJob.id, ...payload });
    } else {
      await createJobPosting.mutateAsync(payload);
    }
    onClose();
  };

  const addSkill = () => {
    const trimmed = skillInput.trim().slice(0, 50);
    if (trimmed && !skills.includes(trimmed) && skills.length < 20) {
      setSkills(prev => [...prev, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(prev => prev.filter(s => s !== skill));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingJob ? 'Edit Job Posting' : 'Create Job Posting'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Job Title *</FormLabel>
                <FormControl><Input {...field} placeholder="e.g., Social Media Manager" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea {...field} placeholder="Describe the job requirements..." rows={4} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-2">
              <FormLabel>Skills Required</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill"
                  maxLength={50}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button type="button" onClick={addSkill}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="gap-1">
                    {skill}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="job_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="one_time">One-time</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="full_time">Full-time</SelectItem>
                      <SelectItem value="part_time">Part-time</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="budget_type" render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="hourly">Hourly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="budget_min" render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Budget</FormLabel>
                  <FormControl><Input type="number" {...field} placeholder="0" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="budget_max" render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Budget</FormLabel>
                  <FormControl><Input type="number" {...field} placeholder="0" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="duration" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., 2 weeks" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingJob ? 'Update' : 'Create'} Job
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
