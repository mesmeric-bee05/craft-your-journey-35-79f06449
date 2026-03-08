import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Loader2, Sparkles, Target } from 'lucide-react';
import { useCampaigns, Campaign } from '@/hooks/useCampaigns';

const channelOptions = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter/X' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
];

interface CreateCampaignDialogProps {
  onCreated?: (campaign: Campaign) => void;
}

export function CreateCampaignDialog({ onCreated }: CreateCampaignDialogProps) {
  const { createCampaign } = useCampaigns();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Campaign['type']>('social');
  const [channels, setChannels] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');

  const toggleChannel = (value: string) => {
    setChannels(prev =>
      prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);

    const campaign = await createCampaign({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      targetChannels: channels,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      budget: budget ? Number(budget) : undefined,
    });

    setCreating(false);

    if (campaign) {
      setOpen(false);
      resetForm();
      onCreated?.(campaign);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('social');
    setChannels([]);
    setStartDate('');
    setEndDate('');
    setBudget('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            New Campaign
          </DialogTitle>
          <DialogDescription>
            Set up a marketing campaign across your channels.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label>Campaign Name *</Label>
            <Input
              placeholder="e.g., Black Friday Promo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe the campaign goals and strategy..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campaign Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Campaign['type'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="multi_channel">Multi-Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget (KES)</Label>
              <Input
                type="number"
                placeholder="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Channels</Label>
            <div className="flex flex-wrap gap-2">
              {channelOptions.map((ch) => (
                <Badge
                  key={ch.value}
                  variant={channels.includes(ch.value) ? 'default' : 'outline'}
                  className="cursor-pointer select-none"
                  onClick={() => toggleChannel(ch.value)}
                >
                  {ch.label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="w-full"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Create Campaign</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
