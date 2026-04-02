import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface AddCompetitorDialogProps {
  onAdd: (data: {
    name: string;
    website: string;
    industry: string;
    notes: string;
    social_handles: Record<string, string>;
  }) => void;
}

export function AddCompetitorDialog({ onAdd }: AddCompetitorDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [notes, setNotes] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const social_handles: Record<string, string> = {};
    if (twitter.trim()) social_handles.twitter = twitter.trim();
    if (instagram.trim()) social_handles.instagram = instagram.trim();
    onAdd({ name: name.trim(), website: website.trim(), industry: industry.trim(), notes: notes.trim(), social_handles });
    setName(''); setWebsite(''); setIndustry(''); setNotes(''); setTwitter(''); setInstagram('');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" />Add Competitor</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Competitor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="comp-name">Name *</Label>
            <Input id="comp-name" value={name} onChange={e => setName(e.target.value)} placeholder="Competitor name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="comp-website">Website</Label>
              <Input id="comp-website" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-industry">Industry</Label>
              <Input id="comp-industry" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. SaaS" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="comp-twitter">Twitter/X</Label>
              <Input id="comp-twitter" value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="@handle" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comp-ig">Instagram</Label>
              <Input id="comp-ig" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@handle" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="comp-notes">Notes</Label>
            <Textarea id="comp-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Key observations..." rows={2} />
          </div>
          <Button type="submit" className="w-full">Add Competitor</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
