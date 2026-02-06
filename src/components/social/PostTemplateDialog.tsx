import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Plus, X } from 'lucide-react';
import { PLATFORM_CONFIGS } from './platformConfig';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type PostTemplate = Database['public']['Tables']['post_templates']['Row'];
type ChannelType = Database['public']['Enums']['channel_type'];

interface PostTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: PostTemplate | null;
  onSave: (data: {
    name: string;
    content: string;
    category?: string;
    platforms?: ChannelType[];
    hashtags?: string[];
  }) => Promise<boolean>;
}

const CATEGORIES = ['Promotional', 'Educational', 'Engagement', 'Announcement', 'Behind the Scenes', 'User Generated'];

export function PostTemplateDialog({ open, onOpenChange, template, onSave }: PostTemplateDialogProps) {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [platforms, setPlatforms] = useState<ChannelType[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState('');
  const [saving, setSaving] = useState(false);

  const isEditing = !!template;

  useEffect(() => {
    if (template) {
      setName(template.name);
      setContent(template.content);
      setCategory(template.category || '');
      setPlatforms((template.platforms as ChannelType[]) || []);
      setHashtags(template.hashtags || []);
    } else {
      setName('');
      setContent('');
      setCategory('');
      setPlatforms([]);
      setHashtags([]);
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    setSaving(true);
    try {
      const success = await onSave({
        name: name.trim(),
        content: content.trim(),
        category: category || undefined,
        platforms: platforms.length > 0 ? platforms : undefined,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
      });

      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const togglePlatform = (platform: ChannelType) => {
    setPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const addHashtag = () => {
    const tag = newHashtag.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags(prev => [...prev, tag]);
      setNewHashtag('');
    }
  };

  const removeHashtag = (tag: string) => {
    setHashtags(prev => prev.filter(t => t !== tag));
  };

  const availablePlatforms = Object.entries(PLATFORM_CONFIGS).filter(
    ([key]) => ['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok'].includes(key)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Template' : 'Create Template'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your post template for quick content creation.'
              : 'Save a reusable template for your social media posts.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Weekly Promotion"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder="Write your template content here. You can use {{variable}} for dynamic values..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              required
            />
            <p className="text-xs text-muted-foreground">
              Tip: Use {"{{business_name}}"}, {"{{date}}"}, {"{{product}}"} for dynamic placeholders
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={category === cat ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setCategory(category === cat ? '' : cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {/* Platforms */}
          <div className="space-y-2">
            <Label>Target Platforms</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availablePlatforms.map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = platforms.includes(key as ChannelType);

                return (
                  <div
                    key={key}
                    onClick={() => togglePlatform(key as ChannelType)}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                      isSelected ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent'
                    )}
                  >
                    <Checkbox checked={isSelected} />
                    <div className={cn('w-6 h-6 rounded flex items-center justify-center', config.bgColor)}>
                      <Icon className={cn('w-3.5 h-3.5', config.color)} />
                    </div>
                    <span className="text-sm font-medium">{config.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <Label>Hashtags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a hashtag"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addHashtag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addHashtag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    #{tag}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => removeHashtag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim() || !content.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
