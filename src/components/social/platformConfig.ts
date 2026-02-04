/**
 * Platform Configuration for Social Media Composer
 * Defines character limits, media specs, and features for each platform
 */

import { 
  Video, 
  Instagram, 
  Facebook, 
  MessageSquare, 
  Send,
  type LucideIcon
} from 'lucide-react';

export interface MediaSpec {
  maxImages: number;
  maxVideoLength: number; // in seconds
  aspectRatios: string[];
  maxFileSize: number; // in MB
  supportedFormats: string[];
}

export interface PlatformFeature {
  name: string;
  available: boolean;
}

export interface PlatformConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  charLimit: number;
  hashtagLimit: number;
  mentionPrefix: string;
  media: MediaSpec;
  features: PlatformFeature[];
  optimalPostTimes: string[]; // e.g., "09:00", "18:00"
  description: string;
}

// Twitter/X Icon component (custom since lucide uses old logo)
export const XIcon = MessageSquare; // Placeholder - using MessageSquare

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: MessageSquare,
    color: 'text-slate-900 dark:text-white',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    charLimit: 280,
    hashtagLimit: 3,
    mentionPrefix: '@',
    media: {
      maxImages: 4,
      maxVideoLength: 140,
      aspectRatios: ['16:9', '1:1'],
      maxFileSize: 15,
      supportedFormats: ['jpg', 'png', 'gif', 'mp4'],
    },
    features: [
      { name: 'Threads', available: true },
      { name: 'Polls', available: true },
      { name: 'Scheduled Posts', available: true },
      { name: 'Quote Tweet', available: true },
    ],
    optimalPostTimes: ['08:00', '12:00', '17:00', '21:00'],
    description: 'Short-form content, news, and real-time engagement',
  },

  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: Instagram,
    color: 'text-pink-600',
    bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    charLimit: 2200,
    hashtagLimit: 30,
    mentionPrefix: '@',
    media: {
      maxImages: 10,
      maxVideoLength: 60,
      aspectRatios: ['1:1', '4:5', '9:16'],
      maxFileSize: 100,
      supportedFormats: ['jpg', 'png', 'mp4', 'mov'],
    },
    features: [
      { name: 'Stories', available: true },
      { name: 'Reels', available: true },
      { name: 'Carousel', available: true },
      { name: 'Shopping Tags', available: true },
    ],
    optimalPostTimes: ['07:00', '12:00', '19:00'],
    description: 'Visual content, stories, and brand aesthetics',
  },

  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: Facebook,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    charLimit: 63206,
    hashtagLimit: 10,
    mentionPrefix: '@',
    media: {
      maxImages: 10,
      maxVideoLength: 240,
      aspectRatios: ['16:9', '1:1', '4:5', '9:16'],
      maxFileSize: 4000,
      supportedFormats: ['jpg', 'png', 'gif', 'mp4', 'mov'],
    },
    features: [
      { name: 'Stories', available: true },
      { name: 'Live Video', available: true },
      { name: 'Events', available: true },
      { name: 'Groups', available: true },
    ],
    optimalPostTimes: ['09:00', '13:00', '16:00'],
    description: 'Community building, long-form content, and events',
  },

  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: Video,
    color: 'text-slate-900 dark:text-white',
    bgColor: 'bg-gradient-to-br from-cyan-400 via-pink-500 to-red-500',
    charLimit: 2200,
    hashtagLimit: 5,
    mentionPrefix: '@',
    media: {
      maxImages: 0, // TikTok is video-first
      maxVideoLength: 600, // 10 minutes
      aspectRatios: ['9:16'],
      maxFileSize: 287,
      supportedFormats: ['mp4', 'mov'],
    },
    features: [
      { name: 'Duets', available: true },
      { name: 'Stitches', available: true },
      { name: 'Effects', available: true },
      { name: 'Sounds', available: true },
    ],
    optimalPostTimes: ['07:00', '10:00', '19:00', '22:00'],
    description: 'Short-form video, trends, and viral content',
  },

  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    charLimit: 1024,
    hashtagLimit: 0,
    mentionPrefix: '@',
    media: {
      maxImages: 30,
      maxVideoLength: 180,
      aspectRatios: ['any'],
      maxFileSize: 16,
      supportedFormats: ['jpg', 'png', 'gif', 'mp4', 'pdf'],
    },
    features: [
      { name: 'Status', available: true },
      { name: 'Broadcast Lists', available: true },
      { name: 'Business Catalog', available: true },
      { name: 'Quick Replies', available: true },
    ],
    optimalPostTimes: ['08:00', '12:00', '18:00'],
    description: 'Direct messaging, status updates, and customer support',
  },

  telegram: {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    color: 'text-sky-500',
    bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    charLimit: 4096,
    hashtagLimit: 20,
    mentionPrefix: '@',
    media: {
      maxImages: 10,
      maxVideoLength: 60,
      aspectRatios: ['any'],
      maxFileSize: 2000,
      supportedFormats: ['jpg', 'png', 'gif', 'mp4', 'pdf', 'doc'],
    },
    features: [
      { name: 'Channels', available: true },
      { name: 'Bots', available: true },
      { name: 'Polls', available: true },
      { name: 'Scheduled Messages', available: true },
    ],
    optimalPostTimes: ['09:00', '14:00', '20:00'],
    description: 'Channels, groups, and automated bots',
  },
};

export const SUPPORTED_PLATFORMS = Object.keys(PLATFORM_CONFIGS);

export function getPlatformConfig(platformId: string): PlatformConfig | undefined {
  return PLATFORM_CONFIGS[platformId.toLowerCase()];
}

export function getCharacterStatus(
  content: string,
  platformId: string
): { count: number; limit: number; percentage: number; isOver: boolean; isWarning: boolean } {
  const config = getPlatformConfig(platformId);
  if (!config) {
    return { count: content.length, limit: 0, percentage: 0, isOver: false, isWarning: false };
  }

  const count = content.length;
  const limit = config.charLimit;
  const percentage = (count / limit) * 100;
  const isOver = count > limit;
  const isWarning = percentage >= 80 && !isOver;

  return { count, limit, percentage, isOver, isWarning };
}

export function extractHashtags(content: string): string[] {
  const hashtagRegex = /#[\w\u0080-\uFFFF]+/g;
  return content.match(hashtagRegex) || [];
}

export function extractMentions(content: string): string[] {
  const mentionRegex = /@[\w\u0080-\uFFFF]+/g;
  return content.match(mentionRegex) || [];
}

export function validateHashtagCount(content: string, platformId: string): boolean {
  const config = getPlatformConfig(platformId);
  if (!config || config.hashtagLimit === 0) return true;
  
  const hashtags = extractHashtags(content);
  return hashtags.length <= config.hashtagLimit;
}

export function getOptimalPostTime(platformId: string): string | undefined {
  const config = getPlatformConfig(platformId);
  if (!config) return undefined;
  
  // Return the first optimal time for simplicity
  // In a real app, this would be based on user's timezone and analytics
  return config.optimalPostTimes[0];
}

// Kenyan/African timezone consideration
export function getLocalOptimalTimes(platformId: string, timezone = 'Africa/Nairobi'): string[] {
  const config = getPlatformConfig(platformId);
  if (!config) return [];
  
  // For now, return the times as-is since they're already optimized for EAT
  return config.optimalPostTimes;
}
