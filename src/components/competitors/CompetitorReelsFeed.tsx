import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bookmark, Play, Heart, MessageCircle, Share2, Eye, Sparkles, Loader2, TrendingUp, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Competitor { id: string; name: string; }

interface ReelItem {
  id: string;
  competitorId: string;
  competitorName: string;
  platform: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  engagementRate: number;
  postedAt: string;
  gradientFrom: string;
  gradientTo: string;
  isViral: boolean;
  postType: string;
}

function generateMockReels(competitors: Competitor[]): ReelItem[] {
  if (competitors.length === 0) return [];
  const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X'];
  const postTypes = ['Reel 🎞️', 'Video 🎬', 'Photo 📷', 'Story ⏰', 'Text 📝'];
  const contents = [
    'New product launch announcement with behind-the-scenes footage 🎬',
    'Customer testimonial — "This changed my business!" 📈',
    'Industry trend breakdown: What\'s coming in 2026',
    'Team culture spotlight — Meet the hustle 👥',
    'Tutorial: Quick tips for growing your audience ✨',
    'Why customers are switching — honest comparison 💡',
    'Flash sale announcement — 48hrs only ⚡ Bei nafuu!',
    'Day in the life — startup vlog from Nairobi 🎥',
    'Behind the scenes at our production facility 🏭',
    'Q&A session — Answering your top questions 🙋',
    'Transformation: Before & after customer results ✨',
    'Trending challenge participation — going viral! 🔥',
  ];
  const gradients = [
    ['from-purple-600', 'to-pink-500'],
    ['from-blue-600', 'to-cyan-400'],
    ['from-orange-500', 'to-red-500'],
    ['from-green-500', 'to-emerald-400'],
    ['from-indigo-600', 'to-violet-400'],
    ['from-rose-500', 'to-amber-400'],
  ];

  return Array.from({ length: 16 }, (_, i) => {
    const comp = competitors[i % competitors.length];
    const grad = gradients[i % gradients.length];
    const likes = Math.floor(Math.random() * 5000) + 100;
    const comments = Math.floor(Math.random() * 500) + 10;
    const shares = Math.floor(Math.random() * 300) + 5;
    const views = Math.floor(Math.random() * 50000) + 1000;
    const engagementRate = ((likes + comments + shares) / views) * 100;
    const isViral = engagementRate > 8;

    return {
      id: `reel-${i}`,
      competitorId: comp.id,
      competitorName: comp.name,
      platform: platforms[i % platforms.length],
      content: contents[i % contents.length],
      likes, comments, shares, views, engagementRate, isViral,
      postType: postTypes[i % postTypes.length],
      postedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      gradientFrom: grad[0],
      gradientTo: grad[1],
    };
  }).sort((a, b) => b.engagementRate - a.engagementRate);
}

const SAVED_KEY = 'smartreach_saved_reels';

interface CompetitorReelsFeedProps { competitors: Competitor[]; }

export function CompetitorReelsFeed({ competitors }: CompetitorReelsFeedProps) {
  const [filterCompetitor, setFilterCompetitor] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [sortBy, setSortBy] = useState<'engagement' | 'views' | 'recent'>('engagement');
  const [saved, setSaved] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]')); } catch { return new Set(); }
  });
  const [gapAnalysis, setGapAnalysis] = useState<string | null>(null);
  const [gapLoading, setGapLoading] = useState(false);

  const reels = useMemo(() => generateMockReels(competitors), [competitors]);

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify([...saved]));
  }, [saved]);

  const filtered = reels
    .filter(r => {
      if (filterCompetitor !== 'all' && r.competitorId !== filterCompetitor) return false;
      if (filterPlatform !== 'all' && r.platform !== filterPlatform) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'views') return b.views - a.views;
      if (sortBy === 'recent') return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      return b.engagementRate - a.engagementRate;
    });

  const toggleSave = (id: string) => {
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (!prev.has(id)) toast.success('Saved for reference');
      return next;
    });
  };

  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  const runGapAnalysis = async () => {
    setGapLoading(true);
    try {
      const topContent = filtered.slice(0, 5).map(r =>
        `${r.competitorName} on ${r.platform}: "${r.content}" (${r.engagementRate.toFixed(1)}% engagement, ${formatNum(r.views)} views)`
      ).join('\n');

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          prompt: `You are a social media strategist for Kenyan SMEs. Analyze these top-performing competitor posts and suggest content gaps:\n\n${topContent}\n\nProvide: 1) Content patterns that work, 2) Gaps in competitor content YOU can fill, 3) Three specific post ideas to create THIS WEEK that could outperform. Be actionable and use Kenyan market context.`,
          type: 'analysis',
        },
      });

      if (error) throw error;
      setGapAnalysis(data?.content || data?.text || 'Analysis generated.');
    } catch {
      toast.error('Failed to generate analysis');
    } finally {
      setGapLoading(false);
    }
  };

  if (competitors.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Add competitors first to see their content feed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters + Actions */}
      <div className="flex gap-3 flex-wrap items-center">
        <Select value={filterCompetitor} onValueChange={setFilterCompetitor}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Competitors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Competitors</SelectItem>
            {competitors.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Platforms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="Instagram">Instagram</SelectItem>
            <SelectItem value="TikTok">TikTok</SelectItem>
            <SelectItem value="YouTube">YouTube</SelectItem>
            <SelectItem value="Twitter/X">Twitter/X</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={v => setSortBy(v as any)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="engagement">Top Engagement</SelectItem>
            <SelectItem value="views">Most Views</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={runGapAnalysis} disabled={gapLoading} className="ml-auto gap-1.5">
          {gapLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Content Gap Analysis
        </Button>
      </div>

      {/* Gap Analysis Results */}
      {gapAnalysis && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Content Gap Analysis</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-line">{gapAnalysis}</p>
          </CardContent>
        </Card>
      )}

      {/* Reels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(reel => (
          <Card key={reel.id} className="overflow-hidden group cursor-pointer relative">
            {/* Viral Badge */}
            {reel.isViral && (
              <Badge className="absolute top-3 right-12 z-10 bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-xs gap-1">
                <Zap className="w-3 h-3" /> Viral
              </Badge>
            )}

            <div className={`relative h-52 bg-gradient-to-br ${reel.gradientFrom} ${reel.gradientTo} flex items-center justify-center`}>
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 text-white fill-white" />
              </div>
              <Badge className="absolute top-3 left-3 bg-black/50 text-white border-0 text-xs">
                {reel.platform}
              </Badge>
              <Badge className="absolute top-10 left-3 bg-black/30 text-white border-0 text-[10px]">
                {reel.postType}
              </Badge>
              <div className="absolute bottom-3 left-3 flex items-center gap-2 text-white text-xs">
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{formatNum(reel.views)}</span>
                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{reel.engagementRate.toFixed(1)}%</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 text-white hover:bg-white/20"
                onClick={e => { e.stopPropagation(); toggleSave(reel.id); }}
              >
                <Bookmark className={`w-4 h-4 ${saved.has(reel.id) ? 'fill-white' : ''}`} />
              </Button>
            </div>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{reel.competitorName}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(reel.postedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">{reel.content}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{formatNum(reel.likes)}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{formatNum(reel.comments)}</span>
                <span className="flex items-center gap-1"><Share2 className="w-3.5 h-3.5" />{formatNum(reel.shares)}</span>
                {saved.has(reel.id) && <Badge variant="secondary" className="text-[10px] ml-auto">Saved</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
