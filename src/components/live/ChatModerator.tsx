import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Ban, 
  Clock, 
  MessageSquareOff,
  AlertTriangle,
  Filter,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LiveChatMessage } from '@/hooks/useLiveChatMessages';

interface ModerationSettings {
  slowMode: number;
  subscribersOnly: boolean;
  linksBlocked: boolean;
  wordFilters: string[];
}

interface ChatModeratorProps {
  streamId: string | null;
  messages: LiveChatMessage[];
  onDeleteMessage: (messageId: string) => void;
  onBanUser?: (userId: string) => void;
  onTimeoutUser?: (userId: string, minutes: number) => void;
  settings?: ModerationSettings;
  onSettingsChange?: (settings: ModerationSettings) => void;
}

export function ChatModerator({
  streamId,
  messages,
  onDeleteMessage,
  onBanUser,
  onTimeoutUser,
  settings = {
    slowMode: 0,
    subscribersOnly: false,
    linksBlocked: false,
    wordFilters: [],
  },
  onSettingsChange,
}: ChatModeratorProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newFilter, setNewFilter] = useState('');
  const [localSettings, setLocalSettings] = useState(settings);

  // Find potentially problematic messages (demo - in production this would use ML/content moderation)
  const flaggedMessages = messages.filter(m => {
    const lowerContent = m.message.toLowerCase();
    return (
      localSettings.wordFilters.some(word => lowerContent.includes(word.toLowerCase())) ||
      (localSettings.linksBlocked && /https?:\/\//.test(m.message))
    );
  });

  const handleAddFilter = () => {
    if (newFilter.trim() && !localSettings.wordFilters.includes(newFilter.trim())) {
      const updated = {
        ...localSettings,
        wordFilters: [...localSettings.wordFilters, newFilter.trim()],
      };
      setLocalSettings(updated);
      onSettingsChange?.(updated);
      setNewFilter('');
    }
  };

  const handleRemoveFilter = (word: string) => {
    const updated = {
      ...localSettings,
      wordFilters: localSettings.wordFilters.filter(w => w !== word),
    };
    setLocalSettings(updated);
    onSettingsChange?.(updated);
  };

  const handleSettingChange = (key: keyof ModerationSettings, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onSettingsChange?.(updated);
  };

  if (!streamId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Create a stream to access moderation tools</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" />
            Moderation
          </CardTitle>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Moderation Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Chat Mode Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Slow Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Seconds between messages
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {[0, 5, 10, 30, 60].map((seconds) => (
                        <Button
                          key={seconds}
                          size="sm"
                          variant={localSettings.slowMode === seconds ? 'default' : 'outline'}
                          onClick={() => handleSettingChange('slowMode', seconds)}
                        >
                          {seconds === 0 ? 'Off' : `${seconds}s`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Subscribers Only</Label>
                      <p className="text-xs text-muted-foreground">
                        Only subscribers can chat
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.subscribersOnly}
                      onCheckedChange={(v) => handleSettingChange('subscribersOnly', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Block Links</Label>
                      <p className="text-xs text-muted-foreground">
                        Prevent URLs in chat
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.linksBlocked}
                      onCheckedChange={(v) => handleSettingChange('linksBlocked', v)}
                    />
                  </div>
                </div>

                {/* Word Filters */}
                <div className="space-y-2">
                  <Label>Blocked Words</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add word to filter..."
                      value={newFilter}
                      onChange={(e) => setNewFilter(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddFilter()}
                    />
                    <Button onClick={handleAddFilter}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localSettings.wordFilters.map((word) => (
                      <Badge key={word} variant="secondary" className="gap-1">
                        {word}
                        <button onClick={() => handleRemoveFilter(word)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {/* Status Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {localSettings.slowMode > 0 && (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              Slow mode: {localSettings.slowMode}s
            </Badge>
          )}
          {localSettings.subscribersOnly && (
            <Badge variant="outline" className="gap-1">
              Subscribers only
            </Badge>
          )}
          {localSettings.linksBlocked && (
            <Badge variant="outline" className="gap-1">
              Links blocked
            </Badge>
          )}
        </div>

        {/* Flagged Messages */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Flagged Messages ({flaggedMessages.length})
          </h4>
          <ScrollArea className="h-[200px]">
            {flaggedMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No flagged messages
              </div>
            ) : (
              <div className="space-y-2">
                {flaggedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium">{msg.user_name}</p>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onDeleteMessage(msg.id)}
                          className="h-6 w-6"
                        >
                          <MessageSquareOff className="w-3 h-3" />
                        </Button>
                        {msg.user_id && onTimeoutUser && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onTimeoutUser(msg.user_id!, 5)}
                            className="h-6 w-6"
                          >
                            <Clock className="w-3 h-3" />
                          </Button>
                        )}
                        {msg.user_id && onBanUser && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onBanUser(msg.user_id!)}
                            className="h-6 w-6 text-destructive"
                          >
                            <Ban className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
