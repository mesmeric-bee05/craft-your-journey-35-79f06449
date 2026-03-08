import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Video, CheckCircle } from 'lucide-react';
import { VideoPlayerDialog } from './VideoPlayerDialog';
import { cn } from '@/lib/utils';

const tutorials = [
  { id: 1, title: 'Platform Overview & Dashboard Tour', description: 'A complete walkthrough of the SmartReach AI platform features and dashboard.', duration: '8:30', category: 'Getting Started', thumbnail: 'bg-gradient-to-br from-primary/20 to-accent/20' },
  { id: 2, title: 'Managing Your Social Inbox', description: 'Learn how to manage multi-channel conversations from WhatsApp, Instagram, and more.', duration: '12:15', category: 'Social Inbox', thumbnail: 'bg-gradient-to-br from-accent/20 to-primary/20' },
  { id: 3, title: 'AI Content Generation Masterclass', description: 'Create stunning social media posts, emails, and marketing copy with AI.', duration: '15:00', category: 'AI Marketing', thumbnail: 'bg-gradient-to-br from-primary/30 to-secondary/30' },
  { id: 4, title: 'Setting Up M-Pesa Payments', description: 'Step-by-step guide to enabling mobile payments for your business.', duration: '6:45', category: 'Payments', thumbnail: 'bg-gradient-to-br from-success/20 to-primary/20' },
  { id: 5, title: 'Live Streaming to Multiple Platforms', description: 'Stream to YouTube, Facebook, and TikTok simultaneously from Live Studio.', duration: '10:20', category: 'Live Studio', thumbnail: 'bg-gradient-to-br from-destructive/20 to-accent/20' },
  { id: 6, title: 'Team Management & Permissions', description: 'Invite team members, assign roles, and manage access controls.', duration: '7:00', category: 'Team', thumbnail: 'bg-gradient-to-br from-warning/20 to-primary/20' },
];

export function VideoTutorialsSection() {
  const [selectedTutorial, setSelectedTutorial] = useState<typeof tutorials[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [watched, setWatched] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartreach_watched_tutorials') || '[]');
    } catch { return []; }
  });

  const handlePlay = (tutorial: typeof tutorials[0]) => {
    setSelectedTutorial(tutorial);
    setDialogOpen(true);
  };

  const handleComplete = (id: number) => {
    const updated = watched.includes(id) ? watched : [...watched, id];
    setWatched(updated);
    localStorage.setItem('smartreach_watched_tutorials', JSON.stringify(updated));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Video Tutorials
          </CardTitle>
          <CardDescription>Watch step-by-step guides to master every feature</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tutorials.map((tutorial) => {
              const isWatched = watched.includes(tutorial.id);
              return (
                <div
                  key={tutorial.id}
                  className={cn(
                    'group rounded-xl border overflow-hidden hover:shadow-medium transition-all cursor-pointer',
                    isWatched && 'ring-1 ring-primary/30'
                  )}
                  onClick={() => handlePlay(tutorial)}
                >
                  <div className={`relative h-32 ${tutorial.thumbnail} flex items-center justify-center`}>
                    <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      {isWatched ? (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      ) : (
                        <Play className="w-5 h-5 text-primary ml-0.5" />
                      )}
                    </div>
                    <Badge className="absolute top-2 right-2 text-xs" variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />{tutorial.duration}
                    </Badge>
                    {isWatched && (
                      <Badge className="absolute top-2 left-2 text-xs bg-primary text-primary-foreground">
                        Watched
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <Badge variant="outline" className="text-xs mb-2">{tutorial.category}</Badge>
                    <h4 className="font-medium text-sm leading-tight">{tutorial.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tutorial.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <VideoPlayerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tutorial={selectedTutorial}
        onComplete={handleComplete}
      />
    </>
  );
}
