import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MoodTracker } from '@/components/wellness/MoodTracker';
import { BreathingExercise } from '@/components/wellness/BreathingExercise';
import { MentalHealthWidget } from '@/components/wellness/MentalHealthWidget';
import { Heart } from 'lucide-react';

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
            Take care of yourself — a healthy founder builds a healthy business.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <MoodTracker />
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
