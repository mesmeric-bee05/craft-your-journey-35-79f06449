import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { FreelancerProfile, useFreelancers } from '@/hooks/useFreelancers';

interface FreelancerProfileFormProps {
  open: boolean;
  onClose: () => void;
  existingProfile?: FreelancerProfile | null;
}

export function FreelancerProfileForm({ open, onClose, existingProfile }: FreelancerProfileFormProps) {
  const { createProfile, updateProfile } = useFreelancers();
  const [formData, setFormData] = useState({
    headline: existingProfile?.headline || '',
    bio: existingProfile?.bio || '',
    skills: existingProfile?.skills || [],
    hourly_rate: existingProfile?.hourly_rate?.toString() || '',
    currency: existingProfile?.currency || 'KES',
    availability: existingProfile?.availability || 'available',
    experience_years: existingProfile?.experience_years?.toString() || '0',
    location: existingProfile?.location || '',
    languages: existingProfile?.languages || [],
  });
  const [skillInput, setSkillInput] = useState('');
  const [languageInput, setLanguageInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
      experience_years: parseInt(formData.experience_years) || 0,
    };

    if (existingProfile) {
      await updateProfile.mutateAsync({ id: existingProfile.id, ...payload });
    } else {
      await createProfile.mutateAsync(payload);
    }
    onClose();
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const addLanguage = () => {
    if (languageInput.trim() && !formData.languages.includes(languageInput.trim())) {
      setFormData(prev => ({ ...prev, languages: [...prev.languages, languageInput.trim()] }));
      setLanguageInput('');
    }
  };

  const removeLanguage = (language: string) => {
    setFormData(prev => ({ ...prev, languages: prev.languages.filter(l => l !== language) }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingProfile ? 'Edit Profile' : 'Create Freelancer Profile'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline *</Label>
            <Input
              id="headline"
              value={formData.headline}
              onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
              placeholder="e.g., Senior Web Developer | React Expert"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell clients about yourself..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
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
              {formData.skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeSkill(skill)} />
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Hourly Rate</Label>
              <Input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KES">KES</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Experience (years)</Label>
              <Input
                type="number"
                value={formData.experience_years}
                onChange={(e) => setFormData(prev => ({ ...prev, experience_years: e.target.value }))}
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Availability</Label>
              <Select
                value={formData.availability}
                onValueChange={(value) => setFormData(prev => ({ ...prev, availability: value as typeof formData.availability }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="unavailable">Unavailable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., Nairobi, Kenya"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Languages</Label>
            <div className="flex gap-2">
              <Input
                value={languageInput}
                onChange={(e) => setLanguageInput(e.target.value)}
                placeholder="Add a language"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
              />
              <Button type="button" onClick={addLanguage}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.languages.map((language) => (
                <Badge key={language} variant="outline" className="gap-1">
                  {language}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeLanguage(language)} />
                </Badge>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createProfile.isPending || updateProfile.isPending}>
              {existingProfile ? 'Update' : 'Create'} Profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
