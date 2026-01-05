import { 
  MessageSquare,
  Send,
  Phone,
  Video,
  Instagram,
  Facebook,
  Mail,
} from 'lucide-react';

// Channel icons and colors
export const channelConfig: Record<string, { icon: React.ComponentType<any>; color: string; bgColor: string }> = {
  whatsapp: { 
    icon: MessageSquare, 
    color: 'text-green-600', 
    bgColor: 'bg-green-100 dark:bg-green-900/30' 
  },
  instagram: { 
    icon: Instagram, 
    color: 'text-pink-600', 
    bgColor: 'bg-pink-100 dark:bg-pink-900/30' 
  },
  facebook: { 
    icon: Facebook, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30' 
  },
  tiktok: { 
    icon: Video, 
    color: 'text-slate-900 dark:text-slate-100', 
    bgColor: 'bg-slate-100 dark:bg-slate-900/30' 
  },
  telegram: { 
    icon: Send, 
    color: 'text-sky-600', 
    bgColor: 'bg-sky-100 dark:bg-sky-900/30' 
  },
  twitter: { 
    icon: MessageSquare, 
    color: 'text-slate-800 dark:text-slate-200', 
    bgColor: 'bg-slate-100 dark:bg-slate-800/30' 
  },
  sms: { 
    icon: Phone, 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-100 dark:bg-purple-900/30' 
  },
  email: { 
    icon: Mail, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30' 
  },
};

export function getChannelConfig(channelType: string) {
  return channelConfig[channelType.toLowerCase()] || channelConfig.whatsapp;
}
