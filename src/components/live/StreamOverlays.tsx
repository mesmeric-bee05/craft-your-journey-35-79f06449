import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Layers, 
  Plus, 
  Trash2,
  Eye,
  EyeOff,
  Type,
  Image,
  AlertCircle,
} from 'lucide-react';
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
import { useStreamOverlays, StreamOverlay, OverlayContent } from '@/hooks/useStreamOverlays';
import { cn } from '@/lib/utils';

interface StreamOverlaysProps {
  streamId: string | null;
}

export function StreamOverlays({ streamId }: StreamOverlaysProps) {
  const {
    overlays,
    loading,
    createOverlay,
    updateOverlay,
    toggleVisibility,
    deleteOverlay,
  } = useStreamOverlays({ streamId });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'image' | 'ticker' | 'alert'>('text');
  const [content, setContent] = useState<OverlayContent>({
    text: '',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    fontSize: 24,
  });
  const [editingOverlay, setEditingOverlay] = useState<StreamOverlay | null>(null);

  const handleCreateOverlay = async () => {
    if (!name.trim()) return;

    await createOverlay(name.trim(), type, content);

    setName('');
    setType('text');
    setContent({
      text: '',
      backgroundColor: '#000000',
      textColor: '#FFFFFF',
      fontSize: 24,
    });
    setIsCreateOpen(false);
  };

  const handleUpdateContent = async (overlay: StreamOverlay, newContent: Partial<OverlayContent>) => {
    await updateOverlay(overlay.id, {
      content: { ...overlay.content, ...newContent },
    });
  };

  const getTypeIcon = (overlayType: string) => {
    switch (overlayType) {
      case 'text':
        return <Type className="w-4 h-4" />;
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'alert':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Layers className="h-5 w-5" />
            Overlays
          </CardTitle>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Overlay</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="Overlay name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <Type className="w-4 h-4" />
                          Text
                        </div>
                      </SelectItem>
                      <SelectItem value="image">
                        <div className="flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Image
                        </div>
                      </SelectItem>
                      <SelectItem value="alert">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Alert
                        </div>
                      </SelectItem>
                      <SelectItem value="ticker">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4" />
                          Ticker
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {type === 'text' || type === 'ticker' || type === 'alert' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Text Content</Label>
                      <Input
                        placeholder="Enter text..."
                        value={content.text || ''}
                        onChange={(e) => setContent({ ...content, text: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Background Color</Label>
                        <Input
                          type="color"
                          value={content.backgroundColor || '#000000'}
                          onChange={(e) => setContent({ ...content, backgroundColor: e.target.value })}
                          className="h-10 p-1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Text Color</Label>
                        <Input
                          type="color"
                          value={content.textColor || '#FFFFFF'}
                          onChange={(e) => setContent({ ...content, textColor: e.target.value })}
                          className="h-10 p-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Font Size</Label>
                      <Input
                        type="number"
                        min={12}
                        max={72}
                        value={content.fontSize || 24}
                        onChange={(e) => setContent({ ...content, fontSize: parseInt(e.target.value) })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Image URL</Label>
                    <Input
                      placeholder="https://..."
                      value={content.imageUrl || ''}
                      onChange={(e) => setContent({ ...content, imageUrl: e.target.value })}
                    />
                  </div>
                )}

                <Button
                  onClick={handleCreateOverlay}
                  disabled={!name.trim()}
                  className="w-full"
                >
                  Create Overlay
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : overlays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No overlays yet</p>
              <p className="text-xs mt-1">Add text, images, or alerts to your stream</p>
            </div>
          ) : (
            <div className="space-y-2">
              {overlays.map((overlay) => (
                <div
                  key={overlay.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    overlay.is_visible ? 'border-primary/50 bg-primary/5' : 'border-border'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded flex items-center justify-center',
                      overlay.is_visible ? 'bg-primary/20' : 'bg-muted'
                    )}>
                      {getTypeIcon(overlay.type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{overlay.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {overlay.type}
                        {overlay.content.text && ` • "${overlay.content.text.slice(0, 20)}..."`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleVisibility(overlay.id)}
                      className="h-8 w-8"
                    >
                      {overlay.is_visible ? (
                        <Eye className="w-4 h-4 text-primary" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingOverlay(overlay)}
                        >
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Overlay: {overlay.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          {(overlay.type === 'text' || overlay.type === 'ticker' || overlay.type === 'alert') && (
                            <>
                              <div className="space-y-2">
                                <Label>Text Content</Label>
                                <Input
                                  value={overlay.content.text || ''}
                                  onChange={(e) => handleUpdateContent(overlay, { text: e.target.value })}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Background</Label>
                                  <Input
                                    type="color"
                                    value={overlay.content.backgroundColor || '#000000'}
                                    onChange={(e) => handleUpdateContent(overlay, { backgroundColor: e.target.value })}
                                    className="h-10 p-1"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Text Color</Label>
                                  <Input
                                    type="color"
                                    value={overlay.content.textColor || '#FFFFFF'}
                                    onChange={(e) => handleUpdateContent(overlay, { textColor: e.target.value })}
                                    className="h-10 p-1"
                                  />
                                </div>
                              </div>
                            </>
                          )}
                          <div className="flex items-center justify-between">
                            <Label>Visible</Label>
                            <Switch
                              checked={overlay.is_visible}
                              onCheckedChange={() => toggleVisibility(overlay.id)}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteOverlay(overlay.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
