import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Calendar as CalendarIcon,
  Clock,
  Image as ImageIcon,
  Hash,
  Send,
  Loader2,
  X,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useScheduledPosts, CreatePostData } from '@/hooks/useScheduledPosts';
import { useHashtagSuggestions, HashtagSuggestion } from '@/hooks/useHashtagSuggestions';
import { useAIContent } from '@/hooks/useAIContent';
import {
  PLATFORM_CONFIGS,
  getCharacterStatus,
  extractHashtags,
  validateHashtagCount,
} from './platformConfig';
import type { Database } from '@/integrations/supabase/types';

type ChannelType = Database['public']['Enums']['channel_type'];

interface UnifiedComposerProps {
  onPostCreated?: () => void;
}

export function UnifiedComposer({ onPostCreated }: UnifiedComposerProps) {
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState('12:00');
  const [isScheduling, setIsScheduling] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);

  const { createPost } = useScheduledPosts();
  const { suggestions, loading: hashtagsLoading, generateSuggestions } = useHashtagSuggestions();
  const { generating, generateContent } = useAIContent();

  // Debounced hashtag suggestions
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (content.length > 20) {
        generateSuggestions(content, selectedPlatforms[0]);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [content, selectedPlatforms, generateSuggestions]);

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  const insertHashtag = (tag: string) => {
    if (!content.includes(tag)) {
      setContent((prev) => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + tag);
    }
  };

  const handleAIGenerate = async () => {
    const generated = await generateContent({
      prompt: content || 'Create an engaging social media post for my business',
      contentType: 'caption',
      language: 'en',
      tone: 'professional',
      platform: selectedPlatforms[0],
    });

    if (generated) {
      setContent(generated);
    }
  };

  const handlePublish = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;

    setIsScheduling(true);

    try {
      // Create posts for each selected platform
      for (const platformId of selectedPlatforms) {
        const postData: CreatePostData = {
          content,
          channelType: platformId as ChannelType,
          scheduledFor: scheduleDate
            ? new Date(`${format(scheduleDate, 'yyyy-MM-dd')}T${scheduleTime}:00`)
            : new Date(),
          hashtags: extractHashtags(content),
        };

        await createPost(postData);
      }

      // Reset form
      setContent('');
      setScheduleDate(undefined);
      onPostCreated?.();
    } finally {
      setIsScheduling(false);
    }
  };

  const getWorstCharStatus = () => {
    let worstStatus = { isOver: false, isWarning: false, percentage: 0 };
    
    for (const platformId of selectedPlatforms) {
      const status = getCharacterStatus(content, platformId);
      if (status.isOver) return status;
      if (status.percentage > worstStatus.percentage) {
        worstStatus = status;
      }
    }
    
    return worstStatus;
  };

  const charStatus = getWorstCharStatus();

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Create Post
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Platform Selection */}
        <div className="space-y-2">
          <Label>Platforms</Label>
          <div className="flex flex-wrap gap-2">
            {Object.values(PLATFORM_CONFIGS).map((platform) => {
              const isSelected = selectedPlatforms.includes(platform.id);
              const Icon = platform.icon;
              const charStatus = getCharacterStatus(content, platform.id);

              return (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-muted hover:border-muted-foreground/50'
                  )}
                >
                  <Icon className={cn('w-4 h-4', platform.color)} />
                  <span className="text-sm font-medium">{platform.name}</span>
                  {isSelected && content.length > 0 && (
                    <Badge
                      variant={charStatus.isOver ? 'destructive' : charStatus.isWarning ? 'outline' : 'secondary'}
                      className="text-xs"
                    >
                      {charStatus.count}/{charStatus.limit}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Content</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAIGenerate}
              disabled={generating}
              className="text-primary"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1" />
              )}
              AI Generate
            </Button>
          </div>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind? Write your post here..."
            rows={6}
            className={cn(
              'resize-none transition-colors',
              charStatus.isOver && 'border-destructive focus-visible:ring-destructive'
            )}
          />
          
          {/* Character Count Indicator */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {charStatus.isOver && (
                <span className="text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Exceeds limit for some platforms
                </span>
              )}
            </div>
            <span className={cn(
              'text-muted-foreground',
              charStatus.isOver && 'text-destructive',
              charStatus.isWarning && 'text-orange-500'
            )}>
              {content.length} characters
            </span>
          </div>
        </div>

        {/* Hashtag Suggestions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Hashtags
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHashtags(!showHashtags)}
            >
              {showHashtags ? 'Hide' : 'Show'} Suggestions
            </Button>
          </div>
          
          {showHashtags && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              {hashtagsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : suggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.tag}
                      onClick={() => insertHashtag(suggestion.tag)}
                      className={cn(
                        'px-2 py-1 rounded-md text-sm transition-colors',
                        content.includes(suggestion.tag)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background hover:bg-muted border'
                      )}
                    >
                      {suggestion.tag}
                      {suggestion.reachEstimate && (
                        <span className="ml-1 text-xs opacity-70">
                          ({suggestion.reachEstimate})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Start typing to get hashtag suggestions
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Scheduling */}
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="w-4 h-4" />
                {scheduleDate ? format(scheduleDate, 'MMM d, yyyy') : 'Schedule'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={scheduleDate}
                onSelect={setScheduleDate}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {scheduleDate && (
            <>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-[120px]"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setScheduleDate(undefined)}
              >
                <X className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handlePublish}
            disabled={!content.trim() || selectedPlatforms.length === 0 || isScheduling || charStatus.isOver}
            className="flex-1"
          >
            {isScheduling ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : scheduleDate ? (
              <CalendarIcon className="w-4 h-4 mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {scheduleDate ? 'Schedule Post' : 'Post Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
