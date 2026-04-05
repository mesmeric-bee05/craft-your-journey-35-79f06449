import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

type PostType = 'hard_day' | 'success' | 'advice' | 'learned';

const POST_TYPES: Record<PostType, { label: string; swahili: string; emoji: string }> = {
  hard_day: { label: 'Hard Day', swahili: 'Siku ngumu', emoji: '🌧️' },
  success:  { label: 'I Succeeded', swahili: 'Nilifanikiwa', emoji: '🎉' },
  advice:   { label: 'Need Advice', swahili: 'Ninahitaji ushauri', emoji: '🤔' },
  learned:  { label: 'I Learned', swahili: 'Nimejifunza', emoji: '📚' },
};

const REACTIONS = [
  { emoji: '❤️', label: 'Ninakusikia', key: 'hear' },
  { emoji: '✊', label: 'Nguvu', key: 'strength' },
  { emoji: '🌱', label: 'Ukuaji', key: 'growth' },
  { emoji: '🤝', label: 'Pamoja', key: 'together' },
];

// Mock community posts
const MOCK_POSTS = [
  { id: '1', persona: 'Msimamizi wa Nairobi', type: 'hard_day' as PostType, text: 'Wateja watatu wamenidai pesa wiki hii na M-Pesa imekatika. Lakini bado tunasimama.', reactions: { hear: 12, strength: 8, growth: 3, together: 5 }, time: '2h ago' },
  { id: '2', persona: 'Mama wa Biashara', type: 'success' as PostType, text: 'Leo nilipata mteja wa kwanza kutoka Instagram! Small wins matter 🎉', reactions: { hear: 4, strength: 15, growth: 22, together: 9 }, time: '5h ago' },
  { id: '3', persona: 'Kijana wa Hustler', type: 'learned' as PostType, text: 'Nimejifunza: kushindwa si mwisho. Biashara yangu ya kwanza ilifeli but now I\'m back stronger.', reactions: { hear: 18, strength: 24, growth: 11, together: 7 }, time: '1d ago' },
];

export function CommunityTab() {
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [postText, setPostText] = useState('');
  const [reacted, setReacted] = useState<Record<string, string>>({});

  const handleReact = (postId: string, reaction: string) => {
    setReacted((prev) => ({ ...prev, [postId]: reaction }));
  };

  return (
    <div className="space-y-6">
      {/* Post composer */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Share with Your Community
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Anonymous & safe. Your identity is hidden. Ubuntu: I am because we are.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(POST_TYPES).map(([key, cfg]) => (
              <Button
                key={key}
                variant={selectedType === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(key as PostType)}
                className="rounded-xl gap-1"
              >
                {cfg.emoji} {cfg.swahili}
              </Button>
            ))}
          </div>
          {selectedType && (
            <div className="space-y-2 animate-fade-in">
              <Textarea
                placeholder="Andika hapa... (anonymous)"
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                rows={3}
                className="resize-none rounded-xl"
              />
              <div className="flex justify-end">
                <Button size="sm" disabled={!postText.trim()}>
                  Share Anonymously
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Community feed */}
      <div className="space-y-3">
        {MOCK_POSTS.map((post) => (
          <Card key={post.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{POST_TYPES[post.type].emoji} {POST_TYPES[post.type].swahili}</Badge>
                  <span className="text-xs text-muted-foreground">{post.persona}</span>
                </div>
                <span className="text-xs text-muted-foreground">{post.time}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{post.text}</p>
              <div className="flex gap-2">
                {REACTIONS.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => handleReact(post.id, r.key)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                      reacted[post.id] === r.key
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted/30 hover:bg-muted/50 text-muted-foreground'
                    }`}
                    title={r.label}
                  >
                    {r.emoji} {(post.reactions as any)[r.key] + (reacted[post.id] === r.key ? 1 : 0)}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
