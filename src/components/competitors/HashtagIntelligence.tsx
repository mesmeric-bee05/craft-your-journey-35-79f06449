import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Hash, TrendingUp, Copy, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface HashtagIntelligenceProps {
  competitors: { id: string; name: string }[];
}

interface HashtagData {
  tag: string;
  frequency: number;
  avgEngagement: number;
  trend: 'up' | 'down' | 'stable';
  topCompetitor: string;
}

function generateMockHashtags(competitors: { id: string; name: string }[]): HashtagData[] {
  if (competitors.length === 0) return [];
  const tags = [
    '#NairobiHustle', '#KenyanBusiness', '#MadeInKenya', '#SupportLocal',
    '#BiasharaYangu', '#SMEKenya', '#DigitalKenya', '#MpesaBusiness',
    '#JuaKaliHustle', '#AfricanEntrepreneur', '#KenyaOnline', '#ShopKenya',
    '#HustleNairobi', '#GrowthMindset', '#BusinessTips', '#EntrepreneurLife',
    '#KenyaStartup', '#SidehustleKenya', '#WomenInBusiness', '#TechKenya',
  ];

  return tags.map((tag, i) => ({
    tag,
    frequency: Math.floor(Math.random() * 50) + 5,
    avgEngagement: parseFloat((Math.random() * 12 + 1).toFixed(1)),
    trend: (['up', 'down', 'stable'] as const)[i % 3],
    topCompetitor: competitors[i % competitors.length].name,
  })).sort((a, b) => b.avgEngagement - a.avgEngagement);
}

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'up') return <ArrowUp className="w-3 h-3 text-green-500" />;
  if (trend === 'down') return <ArrowDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

export function HashtagIntelligence({ competitors }: HashtagIntelligenceProps) {
  const hashtags = useMemo(() => generateMockHashtags(competitors), [competitors]);
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? hashtags : hashtags.slice(0, 10);
  const topTags = hashtags.slice(0, 5).map(h => h.tag);

  const copyWinningHashtags = () => {
    navigator.clipboard.writeText(topTags.join(' '));
    toast.success('Top 5 hashtags copied to clipboard!');
  };

  if (competitors.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Add competitors to see hashtag intelligence.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Hash className="w-5 h-5 text-primary" />
            Hashtag Intelligence
          </h3>
          <p className="text-sm text-muted-foreground">Hashtags your competitors are winning with</p>
        </div>
        <Button variant="outline" size="sm" onClick={copyWinningHashtags} className="gap-1.5">
          <Copy className="w-4 h-4" />
          Use Winning Hashtags
        </Button>
      </div>

      {/* Top tags preview */}
      <div className="flex flex-wrap gap-2">
        {topTags.map(tag => (
          <Badge key={tag} className="gap-1 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer" onClick={() => {
            navigator.clipboard.writeText(tag);
            toast.success(`${tag} copied!`);
          }}>
            <TrendingUp className="w-3 h-3" />
            {tag}
          </Badge>
        ))}
      </div>

      {/* Hashtag table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-5 text-xs font-medium text-muted-foreground py-2 border-b">
              <span className="col-span-1">Hashtag</span>
              <span className="text-center">Uses</span>
              <span className="text-center">Avg Eng.</span>
              <span className="text-center">Trend</span>
              <span className="text-right">Top User</span>
            </div>
            {displayed.map(h => (
              <div key={h.tag} className="grid grid-cols-5 text-sm py-2 border-b border-border/50 items-center hover:bg-muted/30 rounded">
                <span className="font-medium text-foreground truncate">{h.tag}</span>
                <span className="text-center text-muted-foreground">{h.frequency}</span>
                <span className="text-center">
                  <Badge variant={h.avgEngagement > 6 ? 'default' : 'secondary'} className="text-[10px]">
                    {h.avgEngagement}%
                  </Badge>
                </span>
                <span className="flex justify-center">
                  <TrendIcon trend={h.trend} />
                </span>
                <span className="text-right text-xs text-muted-foreground truncate">{h.topCompetitor}</span>
              </div>
            ))}
          </div>
          {hashtags.length > 10 && (
            <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="w-full mt-2">
              {showAll ? 'Show Less' : `Show All (${hashtags.length})`}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
