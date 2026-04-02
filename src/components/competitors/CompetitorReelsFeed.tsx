import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bookmark, Play, Heart, MessageCircle, Share2, Eye } from 'lucide-react';

interface Competitor {
  id: string;
  name: string;
}

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
  postedAt: string;
  gradientFrom: string;
  gradientTo: string;
}

function generateMockReels(competitors: Competitor[]): ReelItem[] {
  if (competitors.length === 0) return [];
  const platforms = ['Instagram', 'TikTok', 'YouTube', 'Twitter/X'];
  const contents = [
    'New product launch announcement with behind-the-scenes footage 🎬',
    'Customer testimonial story — How we helped 1000+ businesses 📈',
    'Industry trend breakdown: What is coming in 2026',
    'Team culture spotlight — Meet our team 👥',
    'Tutorial: How to use our latest feature ✨',
    'Competitor comparison — Why customers switch to us 💡',
    'Flash sale announcement — 48hrs only ⚡',
    'Day in the life of our CEO — startup vlog 🎥',
  ];
  const gradients = [
    ['from-purple-600', 'to-pink-500'],
    ['from-blue-600', 'to-cyan-400'],
    ['from-orange-500', 'to-red-500'],
    ['from-green-500', 'to-emerald-400'],
    ['from-indigo-600', 'to-violet-400'],
  ];

  return Array.from({ length: 12 }, (_, i) => {
    const comp = competitors[i % competitors.length];
    const grad = gradients[i % gradients.length];
    return {
      id: `reel-${i}`,
      competitorId: comp.id,
      competitorName: comp.name,
      platform: platforms[i % platforms.length],
      content: contents[i % contents.length],
      likes: Math.floor(Math.random() * 5000) + 100,
      comments: Math.floor(Math.random() * 500) + 10,
      shares: Math.floor(Math.random() * 300) + 5,
      views: Math.floor(Math.random() * 50000) + 1000,
      postedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
      gradientFrom: grad[0],
      gradientTo: grad[1],
    };
  });
}

interface CompetitorReelsFeedProps {
  competitors: Competitor[];
}

export function CompetitorReelsFeed({ competitors }: CompetitorReelsFeedProps) {
  const [filterCompetitor, setFilterCompetitor] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [saved, setSaved] = useState<Set<string>>(new Set());

  const reels = useMemo(() => generateMockReels(competitors), [competitors]);

  const filtered = reels.filter(r => {
    if (filterCompetitor !== 'all' && r.competitorId !== filterCompetitor) return false;
    if (filterPlatform !== 'all' && r.platform !== filterPlatform) return false;
    return true;
  });

  const toggleSave = (id: string) => {
    setSaved(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatNum = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

  if (competitors.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Add competitors first to see their content feed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
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
      </div>

      {/* Reels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(reel => (
          <Card key={reel.id} className="overflow-hidden group cursor-pointer">
            {/* Video placeholder */}
            <div className={`relative h-52 bg-gradient-to-br ${reel.gradientFrom} ${reel.gradientTo} flex items-center justify-center`}>
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 text-white fill-white" />
              </div>
              <Badge className="absolute top-3 left-3 bg-black/50 text-white border-0 text-xs">
                {reel.platform}
              </Badge>
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white text-xs">
                <Eye className="w-3.5 h-3.5" />
                {formatNum(reel.views)}
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
