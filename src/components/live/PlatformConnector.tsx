import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ExternalLink, Check, X, Loader2 } from 'lucide-react';
import { useStreamDestinations, PLATFORM_CONFIGS } from '@/hooks/useStreamDestinations';
import { cn } from '@/lib/utils';

interface PlatformConnectorProps {
  streamId?: string;
  isStreaming: boolean;
}

export function PlatformConnector({ streamId, isStreaming }: PlatformConnectorProps) {
  const { 
    destinations, 
    loading, 
    addDestination, 
    removeDestination,
    getPlatformConfig 
  } = useStreamDestinations(streamId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [rtmpUrl, setRtmpUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!selectedPlatform || !rtmpUrl || !streamKey) return;

    setSaving(true);
    const result = await addDestination(selectedPlatform, rtmpUrl, streamKey);
    setSaving(false);

    if (result) {
      setDialogOpen(false);
      setSelectedPlatform('');
      setRtmpUrl('');
      setStreamKey('');
    }
  };

  const handlePlatformChange = (platformId: string) => {
    setSelectedPlatform(platformId);
    const config = PLATFORM_CONFIGS.find(p => p.id === platformId);
    if (config) {
      setRtmpUrl(config.rtmpUrlPlaceholder);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Streaming Destinations</CardTitle>
              <CardDescription>
                Connect to multiple platforms to stream simultaneously
              </CardDescription>
            </div>
            <Button 
              size="sm" 
              onClick={() => setDialogOpen(true)}
              disabled={isStreaming || !streamId}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {destinations.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="mb-2">No streaming destinations configured</p>
              <p className="text-sm">Add platforms like Facebook, YouTube, or TikTok to multistream</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-3">
                {destinations.map((dest) => {
                  const config = getPlatformConfig(dest.platform);
                  return (
                    <div
                      key={dest.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                          style={{ backgroundColor: `${config.color}20` }}
                        >
                          {config.icon}
                        </div>
                        <div>
                          <p className="font-medium">{config.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            RTMP credentials hidden
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            dest.status === 'connected' ? 'default' :
                            dest.status === 'error' ? 'destructive' : 'secondary'
                          }
                          className={cn(
                            dest.status === 'connected' && 'bg-green-500'
                          )}
                        >
                          {dest.status === 'connected' && <Check className="h-3 w-3 mr-1" />}
                          {dest.status === 'error' && <X className="h-3 w-3 mr-1" />}
                          {dest.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDestination(dest.id)}
                          disabled={isStreaming}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Add Platform Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Streaming Destination</DialogTitle>
            <DialogDescription>
              Configure RTMP settings to stream to a platform
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={selectedPlatform} onValueChange={handlePlatformChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_CONFIGS.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      <div className="flex items-center gap-2">
                        <span>{platform.icon}</span>
                        <span>{platform.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>RTMP URL</Label>
              <Input
                value={rtmpUrl}
                onChange={(e) => setRtmpUrl(e.target.value)}
                placeholder="rtmp://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Stream Key</Label>
              <Input
                type="password"
                value={streamKey}
                onChange={(e) => setStreamKey(e.target.value)}
                placeholder="Enter your stream key"
              />
            </div>

            {selectedPlatform && (
              <div className="text-sm text-muted-foreground">
                <p>
                  Find your stream key in {getPlatformConfig(selectedPlatform).name}'s creator dashboard.
                </p>
                {getPlatformConfig(selectedPlatform).helpUrl && (
                  <a
                    href={getPlatformConfig(selectedPlatform).helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                  >
                    Learn more <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAdd} 
              disabled={!selectedPlatform || !rtmpUrl || !streamKey || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Destination'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
