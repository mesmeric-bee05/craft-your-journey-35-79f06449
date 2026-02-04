import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface HashtagSuggestion {
  tag: string;
  category: 'trending' | 'relevant' | 'local' | 'niche';
  reachEstimate?: string;
}

interface UseHashtagSuggestionsReturn {
  suggestions: HashtagSuggestion[];
  loading: boolean;
  error: string | null;
  generateSuggestions: (content: string, platform?: string) => Promise<void>;
  clearSuggestions: () => void;
}

// Local trending hashtags for Kenya/Africa (static for Phase 1)
const LOCAL_TRENDING_HASHTAGS: HashtagSuggestion[] = [
  { tag: '#Kenya', category: 'local', reachEstimate: '5M+' },
  { tag: '#Nairobi', category: 'local', reachEstimate: '2M+' },
  { tag: '#MadeinKenya', category: 'local', reachEstimate: '500K+' },
  { tag: '#SupportLocal', category: 'local', reachEstimate: '1M+' },
  { tag: '#AfricanBusiness', category: 'local', reachEstimate: '800K+' },
  { tag: '#KenyanEntrepreneur', category: 'local', reachEstimate: '200K+' },
];

// Category-based hashtags
const CATEGORY_HASHTAGS: Record<string, HashtagSuggestion[]> = {
  business: [
    { tag: '#SmallBusiness', category: 'relevant', reachEstimate: '10M+' },
    { tag: '#Entrepreneur', category: 'relevant', reachEstimate: '15M+' },
    { tag: '#BusinessGrowth', category: 'relevant', reachEstimate: '5M+' },
    { tag: '#SME', category: 'relevant', reachEstimate: '2M+' },
  ],
  fashion: [
    { tag: '#AfricanFashion', category: 'relevant', reachEstimate: '3M+' },
    { tag: '#KenyanFashion', category: 'local', reachEstimate: '500K+' },
    { tag: '#StyleKenya', category: 'local', reachEstimate: '200K+' },
    { tag: '#FashionKenya', category: 'local', reachEstimate: '300K+' },
  ],
  food: [
    { tag: '#KenyanFood', category: 'local', reachEstimate: '400K+' },
    { tag: '#FoodieKenya', category: 'local', reachEstimate: '200K+' },
    { tag: '#AfricanCuisine', category: 'relevant', reachEstimate: '1M+' },
    { tag: '#NairobiEats', category: 'local', reachEstimate: '150K+' },
  ],
  tech: [
    { tag: '#TechKenya', category: 'local', reachEstimate: '300K+' },
    { tag: '#SiliconSavannah', category: 'local', reachEstimate: '100K+' },
    { tag: '#AfriTech', category: 'relevant', reachEstimate: '500K+' },
    { tag: '#StartupKenya', category: 'local', reachEstimate: '200K+' },
  ],
  beauty: [
    { tag: '#BeautyKenya', category: 'local', reachEstimate: '300K+' },
    { tag: '#NaturalHair', category: 'relevant', reachEstimate: '5M+' },
    { tag: '#AfricanBeauty', category: 'relevant', reachEstimate: '2M+' },
    { tag: '#KenyanBeauty', category: 'local', reachEstimate: '150K+' },
  ],
};

// Platform-specific hashtags
const PLATFORM_HASHTAGS: Record<string, HashtagSuggestion[]> = {
  instagram: [
    { tag: '#InstaKenya', category: 'trending', reachEstimate: '1M+' },
    { tag: '#ExplorePage', category: 'trending', reachEstimate: '50M+' },
  ],
  tiktok: [
    { tag: '#KenyaTikTok', category: 'trending', reachEstimate: '2M+' },
    { tag: '#ForYou', category: 'trending', reachEstimate: '100M+' },
    { tag: '#FYP', category: 'trending', reachEstimate: '200M+' },
  ],
  twitter: [
    { tag: '#KenyaTwitter', category: 'trending', reachEstimate: '500K+' },
    { tag: '#KOT', category: 'local', reachEstimate: '1M+' },
  ],
};

export function useHashtagSuggestions(): UseHashtagSuggestionsReturn {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<HashtagSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectCategory = (content: string): string => {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.match(/fashion|clothes|dress|style|wear|outfit/)) return 'fashion';
    if (lowerContent.match(/food|eat|restaurant|cook|chef|meal|menu/)) return 'food';
    if (lowerContent.match(/tech|software|app|digital|startup|code|developer/)) return 'tech';
    if (lowerContent.match(/beauty|makeup|skincare|hair|cosmetic/)) return 'beauty';
    return 'business';
  };

  const generateSuggestions = useCallback(async (content: string, platform?: string) => {
    if (!content.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Try AI-powered generation first
      const { data, error: invokeError } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: `Generate 5 relevant hashtags for this social media post: "${content}". 
                   Focus on hashtags that would perform well in Kenya and East Africa.
                   Return ONLY the hashtags separated by spaces, no explanations.`,
          contentType: 'hashtags',
          language: 'en',
          tone: 'professional',
          platform: platform,
        },
      });

      let aiSuggestions: HashtagSuggestion[] = [];
      
      if (!invokeError && data?.content) {
        // Parse AI-generated hashtags
        const hashtagMatches = data.content.match(/#[\w\u0080-\uFFFF]+/g) || [];
        aiSuggestions = hashtagMatches.slice(0, 5).map((tag: string) => ({
          tag,
          category: 'relevant' as const,
          reachEstimate: 'AI Generated',
        }));
      }

      // Combine with local/category-based suggestions
      const category = detectCategory(content);
      const categorySuggestions = CATEGORY_HASHTAGS[category] || CATEGORY_HASHTAGS.business;
      const platformSuggestions = platform ? PLATFORM_HASHTAGS[platform.toLowerCase()] || [] : [];
      
      // Merge and deduplicate
      const allSuggestions = [
        ...aiSuggestions,
        ...LOCAL_TRENDING_HASHTAGS.slice(0, 3),
        ...categorySuggestions.slice(0, 3),
        ...platformSuggestions.slice(0, 2),
      ];

      // Remove duplicates by tag
      const uniqueSuggestions = allSuggestions.filter(
        (suggestion, index, self) =>
          index === self.findIndex((s) => s.tag.toLowerCase() === suggestion.tag.toLowerCase())
      );

      setSuggestions(uniqueSuggestions.slice(0, 15));
    } catch (err: unknown) {
      // Fallback to static suggestions if AI fails
      const category = detectCategory(content);
      const fallbackSuggestions = [
        ...LOCAL_TRENDING_HASHTAGS.slice(0, 3),
        ...(CATEGORY_HASHTAGS[category] || CATEGORY_HASHTAGS.business).slice(0, 4),
      ];
      
      setSuggestions(fallbackSuggestions);
      logger.error('Error generating AI hashtags, using fallback', err, { hook: 'useHashtagSuggestions' });
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  return {
    suggestions,
    loading,
    error,
    generateSuggestions,
    clearSuggestions,
  };
}
