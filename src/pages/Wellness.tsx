import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DailyCheckin } from '@/components/biashara-mind/DailyCheckin';
import { BurnoutGauge } from '@/components/biashara-mind/BurnoutGauge';
import { MicroJournal } from '@/components/biashara-mind/MicroJournal';
import { RafikiChat } from '@/components/wellness/RafikiChat';
import { BreathingExercise } from '@/components/wellness/BreathingExercise';
import { WinsVault } from '@/components/biashara-mind/WinsVault';
import { MoodHeatmap } from '@/components/biashara-mind/MoodHeatmap';
import { CommunityTab } from '@/components/biashara-mind/CommunityTab';
import { CrisisButton } from '@/components/biashara-mind/CrisisButton';
import { Brain, Heart, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBiasharaMind } from '@/hooks/useBiasharaMind';

export default function Wellness() {
  const { tokenBalance, streak } = useBiasharaMind();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              Biashara Mind™
            </h1>
            <p className="text-muted-foreground mt-1">
              Afya yako ya akili ina thamani ya biashara yako. <span className="italic">Your mental health is your business asset.</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <Badge variant="secondary" className="gap-1">🔥 {streak}-day streak</Badge>
            )}
            <Badge variant="outline" className="gap-1">✨ {tokenBalance} tokens</Badge>
          </div>
        </div>

        {/* 4-Tab Architecture */}
        <Tabs defaultValue="how-i-feel" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="how-i-feel" className="gap-1.5 text-xs sm:text-sm">
              <Heart className="w-4 h-4" /> How I Feel
            </TabsTrigger>
            <TabsTrigger value="ai-companion" className="gap-1.5 text-xs sm:text-sm">
              <Brain className="w-4 h-4" /> Rafiki AI
            </TabsTrigger>
            <TabsTrigger value="my-growth" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="w-4 h-4" /> My Growth
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-1.5 text-xs sm:text-sm">
              <Users className="w-4 h-4" /> Community
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: How I Feel */}
          <TabsContent value="how-i-feel" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <DailyCheckin />
                <MicroJournal />
              </div>
              <div className="space-y-6">
                <BurnoutGauge />
                <BreathingExercise />
                <CrisisButton />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: AI Companion */}
          <TabsContent value="ai-companion" className="space-y-4">
            <Card className="border-primary/10 bg-primary/5 dark:bg-primary/5">
              <CardContent className="py-3 px-4 text-sm text-muted-foreground">
                🔒 This conversation is private. It is not stored in your business profile and is not visible to anyone else. <span className="italic">Mimi si daktari wa akili — ni rafiki anayesikiliza.</span>
              </CardContent>
            </Card>
            <RafikiChat />
            <CrisisButton />
          </TabsContent>

          {/* TAB 3: My Growth */}
          <TabsContent value="my-growth" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MoodHeatmap />
              <BurnoutGauge />
            </div>
            <WinsVault />
          </TabsContent>

          {/* TAB 4: Community */}
          <TabsContent value="community">
            <CommunityTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
