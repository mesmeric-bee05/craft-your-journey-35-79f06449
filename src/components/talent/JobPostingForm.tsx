import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { JobPosting, useJobPostings } from '@/hooks/useJobPostings';

interface JobPostingFormProps {
  open: boolean;
  onClose: () => void;
  editingJob?: JobPosting;
}

export function JobPostingForm({ open, onClose, editingJob }: JobPostingFormProps) {
  const { createJobPosting, updateJobPosting } = useJobPostings();
  const [formData, setFormData] = useState({
    title: editingJob?.title || '',
    description: editingJob?.description || '',
    skills_required: editingJob?.skills_required || [],
    job_type: editingJob?.job_type || 'one_time',
    budget_type: editingJob?.budget_type || 'fixed',
    budget_min: editingJob?.budget_min?.toString() || '',
    budget_max: editingJob?.budget_max?.toString() || '',
    currency: editingJob?.currency || 'KES',
    duration: editingJob?.duration || '',
    location_type: editingJob?.location_type || 'remote',
    status: editingJob?.status || 'draft',
  });
  const [skillInput, setSkillInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
      budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
    };

    if (editingJob) {
      await updateJobPosting.mutateAsync({ id: editingJob.id, ...payload });
    } else {
      await createJobPosting.mutateAsync(payload);
    }
    onClose();
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills_required.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills_required: [...prev.skills_required, skillInput.trim()],
      }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills_required: prev.skills_required.filter(s => s !== skill),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingJob ? 'Edit Job Posting' : 'Create Job Posting'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Social Media Manager"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the job requirements..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Skills Required</Label>
            <div className="flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                placeholder="Add a skill"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <Button type="button" onClick={addSkill}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.skills_required.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Job Type</Label>
              <Select
                value={formData.job_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, job_type: value as typeof formData.job_type }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location Type</Label>
              <Select
                value={formData.location_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, location_type: value as typeof formData.location_type }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Budget Type</Label>
              <Select
                value={formData.budget_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, budget_type: value as typeof formData.budget_type }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Min Budget</Label>
              <Input
                type="number"
                value={formData.budget_min}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_min: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Max Budget</Label>
              <Input
                type="number"
                value={formData.budget_max}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_max: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration</Label>
              <Input
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g., 2 weeks"
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as typeof formData.status }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createJobPosting.isPending || updateJobPosting.isPending}>
              {editingJob ? 'Update' : 'Create'} Job
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
