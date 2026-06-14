import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type LiveStream = Omit<Database['public']['Tables']['live_streams']['Row'], 'stream_key' | 'rtmp_url'> & {
  stream_key?: string | null;
  rtmp_url?: string | null;
};

interface StreamSettings {
  chatEnabled: boolean;
  slowModeSeconds: number;
  subscribersOnly: boolean;
  recordStream: boolean;
}

interface StreamSettingsDialogProps {
  stream: LiveStream | null;
  onSettingsChange?: (settings: StreamSettings) => void;
}

export function StreamSettingsDialog({ stream, onSettingsChange }: StreamSettingsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [settings, setSettings] = useState<StreamSettings>({
    chatEnabled: true,
    slowModeSeconds: 0,
    subscribersOnly: false,
    recordStream: true,
  });

  // Initialize from stream
  useEffect(() => {
    if (stream) {
      setTitle(stream.title);
      setDescription(stream.description || '');
      
      const metadata = stream.metadata as Record<string, any> || {};
      setSettings({
        chatEnabled: metadata.chatEnabled ?? true,
        slowModeSeconds: metadata.slowModeSeconds ?? 0,
        subscribersOnly: metadata.subscribersOnly ?? false,
        recordStream: metadata.recordStream ?? true,
      });
    }
  }, [stream]);

  const handleSave = async () => {
    if (!stream) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('live_streams')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          metadata: {
            ...(stream.metadata as Record<string, any> || {}),
            ...settings,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', stream.id);

      if (error) throw error;

      toast({ title: 'Settings saved' });
      onSettingsChange?.(settings);
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Failed to save settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!stream) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stream Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Stream Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Stream Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter stream title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's your stream about?"
                rows={3}
              />
            </div>
          </div>

          {/* Chat Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Chat Settings</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="chat-enabled">Enable Chat</Label>
                <p className="text-xs text-muted-foreground">Allow viewers to chat</p>
              </div>
              <Switch
                id="chat-enabled"
                checked={settings.chatEnabled}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, chatEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="slow-mode">Slow Mode</Label>
                <p className="text-xs text-muted-foreground">Limit chat frequency</p>
              </div>
              <Select
                value={settings.slowModeSeconds.toString()}
                onValueChange={(v) => 
                  setSettings({ ...settings, slowModeSeconds: parseInt(v) })
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Off</SelectItem>
                  <SelectItem value="5">5 sec</SelectItem>
                  <SelectItem value="10">10 sec</SelectItem>
                  <SelectItem value="30">30 sec</SelectItem>
                  <SelectItem value="60">1 min</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="subs-only">Subscribers Only</Label>
                <p className="text-xs text-muted-foreground">Limit chat to subscribers</p>
              </div>
              <Switch
                id="subs-only"
                checked={settings.subscribersOnly}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, subscribersOnly: checked })
                }
              />
            </div>
          </div>

          {/* Recording */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Recording</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="record">Record Stream</Label>
                <p className="text-xs text-muted-foreground">Save stream for later</p>
              </div>
              <Switch
                id="record"
                checked={settings.recordStream}
                onCheckedChange={(checked) => 
                  setSettings({ ...settings, recordStream: checked })
                }
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
