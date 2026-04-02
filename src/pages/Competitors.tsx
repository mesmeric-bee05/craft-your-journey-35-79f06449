import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompetitorTracker } from '@/components/competitors/CompetitorTracker';
import { CompetitorReelsFeed } from '@/components/competitors/CompetitorReelsFeed';
import { useCompetitors } from '@/hooks/useCompetitors';
import { Target, Film, BarChart3 } from 'lucide-react';

export default function Competitors() {
  const { competitors } = useCompetitors();

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            Competitor Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor, analyze, and outperform your competition.
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="w-4 h-4" />Overview
            </TabsTrigger>
            <TabsTrigger value="reels" className="gap-1.5">
              <Film className="w-4 h-4" />Reels Feed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CompetitorTracker />
          </TabsContent>

          <TabsContent value="reels">
            <CompetitorReelsFeed competitors={competitors.map((c: any) => ({ id: c.id, name: c.name }))} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
