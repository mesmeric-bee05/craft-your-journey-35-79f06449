import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MoodTracker } from '@/components/wellness/MoodTracker';
import { BreathingExercise } from '@/components/wellness/BreathingExercise';
import { MentalHealthWidget } from '@/components/wellness/MentalHealthWidget';
import { RafikiChat } from '@/components/wellness/RafikiChat';
import { Heart, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function Wellness() {
  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Heart className="w-8 h-8 text-primary" />
            Wellness Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Take care of yourself — a healthy founder builds a healthy business. <span className="italic">Afya ni mali.</span>
          </p>
        </div>

        {/* Crisis Banner */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-4 flex items-center gap-3 text-sm">
            <Phone className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-muted-foreground">
              Need to talk to someone? <a href="tel:+254722178177" className="text-primary font-medium hover:underline">Befrienders Kenya: +254 722 178 177</a> (24/7, free & confidential)
            </span>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <MoodTracker />
            <RafikiChat />
            <MentalHealthWidget />
          </div>
          <div className="space-y-6">
            <BreathingExercise />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
