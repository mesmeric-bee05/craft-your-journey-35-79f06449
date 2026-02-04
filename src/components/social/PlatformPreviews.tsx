import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Send,
  MoreHorizontal,
  Play,
  Eye,
  ThumbsUp,
  Check,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PLATFORM_CONFIGS,
  getCharacterStatus,
  extractHashtags,
  type PlatformConfig,
} from './platformConfig';

interface PreviewProps {
  content: string;
  mediaUrl?: string;
  profileName?: string;
  profileHandle?: string;
}

// Twitter/X Preview
function TwitterPreview({ content, mediaUrl, profileName = 'Your Business', profileHandle = '@yourbusiness' }: PreviewProps) {
  const charStatus = getCharacterStatus(content, 'twitter');
  const hashtags = extractHashtags(content);

  return (
    <Card className="overflow-hidden bg-background">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {profileName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{profileName}</span>
              <span className="text-muted-foreground text-sm">{profileHandle}</span>
              <span className="text-muted-foreground text-sm">· now</span>
            </div>
            <p className="text-sm mt-1 whitespace-pre-wrap break-words">
              {content || <span className="text-muted-foreground italic">Your post preview...</span>}
            </p>
            {mediaUrl && (
              <div className="mt-3 rounded-xl overflow-hidden border">
                <img src={mediaUrl} alt="Preview" className="w-full h-40 object-cover" />
              </div>
            )}
            <div className="flex items-center justify-between mt-3 text-muted-foreground">
              <button className="flex items-center gap-1 hover:text-primary">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">0</span>
              </button>
              <button className="flex items-center gap-1 hover:text-green-500">
                <Share2 className="w-4 h-4" />
                <span className="text-xs">0</span>
              </button>
              <button className="flex items-center gap-1 hover:text-pink-500">
                <Heart className="w-4 h-4" />
                <span className="text-xs">0</span>
              </button>
              <button className="flex items-center gap-1 hover:text-primary">
                <Bookmark className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {charStatus.isOver && (
          <Badge variant="destructive" className="mt-2">
            {charStatus.count - charStatus.limit} characters over limit
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// Instagram Preview
function InstagramPreview({ content, mediaUrl, profileName = 'yourbusiness' }: PreviewProps) {
  const charStatus = getCharacterStatus(content, 'instagram');

  return (
    <Card className="overflow-hidden bg-background">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 ring-2 ring-pink-500 ring-offset-2">
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                {profileName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm">{profileName}</span>
          </div>
          <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Image Area */}
        <div className="aspect-square bg-muted flex items-center justify-center">
          {mediaUrl ? (
            <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-muted-foreground">
              <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Add media</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Heart className="w-6 h-6" />
              <MessageCircle className="w-6 h-6" />
              <Send className="w-6 h-6" />
            </div>
            <Bookmark className="w-6 h-6" />
          </div>
          <p className="font-semibold text-sm mb-1">0 likes</p>
          <p className="text-sm">
            <span className="font-semibold">{profileName}</span>{' '}
            {content || <span className="text-muted-foreground italic">Your caption here...</span>}
          </p>
        </div>
        {charStatus.isOver && (
          <div className="px-3 pb-3">
            <Badge variant="destructive">
              {charStatus.count - charStatus.limit} characters over limit
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Facebook Preview
function FacebookPreview({ content, mediaUrl, profileName = 'Your Business' }: PreviewProps) {
  return (
    <Card className="overflow-hidden bg-background">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-blue-600 text-white">
              {profileName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{profileName}</p>
            <p className="text-xs text-muted-foreground">Just now · 🌐</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 pb-3">
          <p className="text-sm whitespace-pre-wrap">
            {content || <span className="text-muted-foreground italic">What's on your mind?</span>}
          </p>
        </div>

        {/* Media */}
        {mediaUrl && (
          <img src={mediaUrl} alt="Preview" className="w-full h-48 object-cover" />
        )}

        {/* Actions */}
        <div className="flex items-center justify-around py-2 border-t">
          <button className="flex items-center gap-2 text-muted-foreground hover:bg-muted px-4 py-2 rounded-lg">
            <ThumbsUp className="w-5 h-5" />
            <span className="text-sm">Like</span>
          </button>
          <button className="flex items-center gap-2 text-muted-foreground hover:bg-muted px-4 py-2 rounded-lg">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">Comment</span>
          </button>
          <button className="flex items-center gap-2 text-muted-foreground hover:bg-muted px-4 py-2 rounded-lg">
            <Share2 className="w-5 h-5" />
            <span className="text-sm">Share</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// TikTok Preview
function TikTokPreview({ content, mediaUrl, profileName = '@yourbusiness' }: PreviewProps) {
  return (
    <Card className="overflow-hidden bg-black text-white aspect-[9/16] max-h-[400px] relative">
      <CardContent className="p-0 h-full flex flex-col justify-end">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80">
          {mediaUrl ? (
            <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-400 via-pink-500 to-red-500">
              <Play className="w-16 h-16 opacity-50" />
            </div>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4">
          <Avatar className="w-10 h-10 border-2 border-white">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {profileName[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-center">
            <Heart className="w-7 h-7" />
            <span className="text-xs">0</span>
          </div>
          <div className="flex flex-col items-center">
            <MessageCircle className="w-7 h-7" />
            <span className="text-xs">0</span>
          </div>
          <div className="flex flex-col items-center">
            <Share2 className="w-7 h-7" />
            <span className="text-xs">0</span>
          </div>
        </div>

        {/* Bottom Content */}
        <div className="relative z-10 p-4">
          <p className="font-semibold text-sm mb-1">{profileName}</p>
          <p className="text-sm line-clamp-3">
            {content || 'Your TikTok caption here...'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// WhatsApp Preview
function WhatsAppPreview({ content, mediaUrl, profileName = 'Your Business' }: PreviewProps) {
  const charStatus = getCharacterStatus(content, 'whatsapp');

  return (
    <Card className="overflow-hidden bg-[#0b141a]">
      <CardContent className="p-4">
        {/* Chat Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-green-600 text-white">
              {profileName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-white text-sm">{profileName}</p>
            <p className="text-xs text-green-400">online</p>
          </div>
        </div>

        {/* Message Bubble */}
        <div className="mt-4 flex justify-end">
          <div className="max-w-[80%] bg-[#005c4b] rounded-lg p-3">
            {mediaUrl && (
              <img src={mediaUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg mb-2" />
            )}
            <p className="text-white text-sm whitespace-pre-wrap">
              {content || <span className="opacity-50 italic">Type a message...</span>}
            </p>
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-[10px] text-white/60">now</span>
              <CheckCheck className="w-4 h-4 text-blue-400" />
            </div>
          </div>
        </div>

        {charStatus.isOver && (
          <Badge variant="destructive" className="mt-3">
            {charStatus.count - charStatus.limit} characters over limit
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// Telegram Preview
function TelegramPreview({ content, mediaUrl, profileName = 'Your Channel' }: PreviewProps) {
  return (
    <Card className="overflow-hidden bg-[#17212b]">
      <CardContent className="p-4">
        {/* Channel Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-sky-500 text-white">
              {profileName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-white text-sm">{profileName}</p>
            <p className="text-xs text-sky-400">1.2K subscribers</p>
          </div>
        </div>

        {/* Message */}
        <div className="mt-4">
          {mediaUrl && (
            <img src={mediaUrl} alt="Preview" className="w-full h-40 object-cover rounded-lg mb-3" />
          )}
          <p className="text-white text-sm whitespace-pre-wrap">
            {content || <span className="opacity-50 italic">Write a message...</span>}
          </p>
          <div className="flex items-center gap-2 mt-2 text-white/50 text-xs">
            <Eye className="w-4 h-4" />
            <span>0 views</span>
            <span>· now</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PlatformPreviewsProps {
  content: string;
  selectedPlatforms: string[];
  mediaUrl?: string;
  profileName?: string;
  profileHandle?: string;
}

export function PlatformPreviews({
  content,
  selectedPlatforms,
  mediaUrl,
  profileName,
  profileHandle,
}: PlatformPreviewsProps) {
  const previewComponents: Record<string, React.FC<PreviewProps>> = {
    twitter: TwitterPreview,
    instagram: InstagramPreview,
    facebook: FacebookPreview,
    tiktok: TikTokPreview,
    whatsapp: WhatsAppPreview,
    telegram: TelegramPreview,
  };

  if (selectedPlatforms.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <p>Select a platform to see preview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {selectedPlatforms.map((platformId) => {
          const PreviewComponent = previewComponents[platformId];
          const config = PLATFORM_CONFIGS[platformId];

          if (!PreviewComponent || !config) return null;

          return (
            <div key={platformId}>
              <div className="flex items-center gap-2 mb-2">
                <config.icon className={cn('w-4 h-4', config.color)} />
                <span className="text-sm font-medium">{config.name}</span>
                <Badge variant="outline" className="text-xs">
                  Preview
                </Badge>
              </div>
              <PreviewComponent
                content={content}
                mediaUrl={mediaUrl}
                profileName={profileName}
                profileHandle={profileHandle}
              />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
