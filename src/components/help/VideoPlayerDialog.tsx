import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft, ChevronRight, CheckCircle, LayoutDashboard,
  MessageSquare, Sparkles, Wallet, Video, Users,
  Settings, Share2, BarChart3, Shield, Zap, Globe,
  Send, Bot, CreditCard, Monitor, UserPlus, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WalkthroughStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  tips: string[];
}

const tutorialWalkthroughs: Record<number, WalkthroughStep[]> = {
  1: [
    { title: 'Welcome to Your Dashboard', description: 'Your command center shows real-time metrics: conversations, revenue, customer growth, and team activity — all in one glance.', icon: LayoutDashboard, gradient: 'from-primary/20 to-accent/20', tips: ['Use the SmartReach Score to track business health', 'Quick Actions let you jump to common tasks instantly'] },
    { title: 'Navigate the Sidebar', description: 'Access all modules from the left sidebar: Social Inbox, Marketing, Live Studio, Payments, Analytics, and more.', icon: Zap, gradient: 'from-accent/20 to-primary/20', tips: ['Press ⌘K to search anything globally', 'Badge counts show unread items'] },
    { title: 'Real-Time Notifications', description: 'The notification bell keeps you updated on new messages, assignments, SLA warnings, and team activity.', icon: Shield, gradient: 'from-primary/30 to-secondary/30', tips: ['Configure notification preferences in Settings', 'Click notifications to jump directly to the source'] },
    { title: 'Analytics at a Glance', description: 'Dashboard charts show conversation trends, revenue patterns, and channel performance over time.', icon: BarChart3, gradient: 'from-chart-1/20 to-chart-3/20', tips: ['Hover over chart points for detailed data', 'Export reports from the Reports page'] },
  ],
  2: [
    { title: 'Unified Inbox Overview', description: 'All customer conversations from WhatsApp, Instagram, Facebook, Email, and SMS appear in one unified inbox.', icon: MessageSquare, gradient: 'from-accent/20 to-primary/20', tips: ['Filter by channel, status, or priority', 'Search conversations with Ctrl+F'] },
    { title: 'Managing Conversations', description: 'Click any conversation to open the chat view. Send replies, attach files, and use internal notes for team communication.', icon: Send, gradient: 'from-primary/20 to-accent/20', tips: ['Use / to access quick replies', 'Internal notes are only visible to your team'] },
    { title: 'AI-Powered Suggestions', description: 'SmartReach AI analyzes the conversation context and suggests relevant replies to speed up response times.', icon: Bot, gradient: 'from-primary/30 to-secondary/30', tips: ['Click a suggestion to insert it instantly', 'AI learns from your reply patterns over time'] },
    { title: 'Assignment & SLA Tracking', description: 'Assign conversations to team members and track SLA compliance with color-coded badges.', icon: Users, gradient: 'from-chart-2/20 to-chart-4/20', tips: ['Green = within SLA, Yellow = warning, Red = breached', 'Auto-assignment routes by channel or priority'] },
  ],
  3: [
    { title: 'AI Content Studio', description: 'Generate social media posts, email campaigns, ad copy, and product descriptions using AI — all tailored to your brand voice.', icon: Sparkles, gradient: 'from-primary/30 to-secondary/30', tips: ['Select your target platform for optimized content', 'Choose tone: professional, casual, witty, etc.'] },
    { title: 'Multi-Platform Optimization', description: 'AI automatically adjusts content length, hashtags, and formatting for each platform — Instagram, Twitter, LinkedIn, and more.', icon: Globe, gradient: 'from-accent/20 to-primary/20', tips: ['Preview how posts look on each platform', 'Character counts update in real-time'] },
    { title: 'Content Calendar', description: 'Schedule and manage all your content from a visual calendar. Drag and drop to reschedule posts easily.', icon: BarChart3, gradient: 'from-chart-1/20 to-chart-5/20', tips: ['Color-coded events by type', 'Link posts to marketing campaigns'] },
    { title: 'Performance Analytics', description: 'Track which AI-generated content performs best. View engagement rates, reach, and ROI for every piece of content.', icon: BarChart3, gradient: 'from-primary/20 to-accent/20', tips: ['Compare performance across platforms', 'Use top posts as templates'] },
  ],
  4: [
    { title: 'M-Pesa Integration', description: 'Accept mobile payments from customers across Kenya through M-Pesa STK Push — seamless, instant, and secure.', icon: CreditCard, gradient: 'from-success/20 to-primary/20', tips: ['Customers receive a prompt on their phone', 'Transactions are tracked in real-time'] },
    { title: 'Wallet Management', description: 'Track your business wallet balance, view transaction history, and manage payouts from one dashboard.', icon: Wallet, gradient: 'from-primary/20 to-success/20', tips: ['Filter transactions by type and date', 'Export transaction reports as CSV'] },
    { title: 'Payment Security', description: 'All payments are processed with bank-grade encryption. Rate limiting prevents fraud and abuse.', icon: Shield, gradient: 'from-warning/20 to-primary/20', tips: ['Sensitive operations have extra rate limits', 'All payment actions are logged in the audit trail'] },
  ],
  5: [
    { title: 'Multi-Platform Streaming', description: 'Go live on YouTube, Facebook, TikTok, and Instagram simultaneously from one interface.', icon: Video, gradient: 'from-destructive/20 to-accent/20', tips: ['Add RTMP destinations for each platform', 'Test your stream before going live'] },
    { title: 'Live Chat Moderation', description: 'Monitor and moderate live chat in real-time. Pin messages, delete spam, and engage with your audience.', icon: MessageSquare, gradient: 'from-accent/20 to-destructive/20', tips: ['Pin important messages for visibility', 'Use quick responses for common questions'] },
    { title: 'Stream Overlays & Polls', description: 'Add custom overlays, run live polls, and display real-time viewer counts to boost engagement.', icon: Monitor, gradient: 'from-primary/20 to-chart-3/20', tips: ['Create polls before your stream starts', 'Overlays update in real-time'] },
  ],
  6: [
    { title: 'Invite Team Members', description: 'Send email invitations to your team. Assign roles like Admin, Manager, or Agent to control access.', icon: UserPlus, gradient: 'from-warning/20 to-primary/20', tips: ['Invitations expire after 7 days', 'Re-send expired invitations anytime'] },
    { title: 'Role-Based Permissions', description: 'Each role has specific permissions. Admins get full access, Agents handle conversations, Managers oversee operations.', icon: Lock, gradient: 'from-primary/20 to-warning/20', tips: ['Review permissions before assigning roles', 'Only owners can delete the business'] },
    { title: 'Team Activity Tracking', description: 'Monitor team performance with metrics like response times, conversations handled, and CSAT scores.', icon: BarChart3, gradient: 'from-chart-2/20 to-chart-4/20', tips: ['Export team reports for performance reviews', 'Set SLA targets per team or agent'] },
  ],
};

interface VideoPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorial: { id: number; title: string; category: string; duration: string } | null;
  onComplete: (id: number) => void;
}

export function VideoPlayerDialog({ open, onOpenChange, tutorial, onComplete }: VideoPlayerDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!tutorial) return null;

  const steps = tutorialWalkthroughs[tutorial.id] || tutorialWalkthroughs[1];
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete(tutorial.id);
      onOpenChange(false);
      setCurrentStep(0);
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const handlePrev = () => setCurrentStep(s => Math.max(0, s - 1));

  const handleClose = (val: boolean) => {
    if (!val) setCurrentStep(0);
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        {/* Visual Header */}
        <div className={cn('relative h-48 sm:h-56 bg-gradient-to-br flex flex-col items-center justify-center gap-3', step.gradient)}>
          <div className="w-16 h-16 rounded-2xl bg-background/90 flex items-center justify-center shadow-lg">
            <step.icon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-bold text-foreground text-center px-4">{step.title}</h3>
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="text-xs">{tutorial.category}</Badge>
          </div>
          <div className="absolute top-3 right-10">
            <Badge variant="outline" className="text-xs bg-background/80">
              {currentStep + 1} / {steps.length}
            </Badge>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="sr-only">{step.title}</DialogTitle>
            <DialogDescription className="text-sm text-foreground/80 leading-relaxed">
              {step.description}
            </DialogDescription>
          </DialogHeader>

          {/* Tips */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pro Tips</p>
            <ul className="space-y-1.5">
              {step.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-1.5" />

          {/* Navigation */}
          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentStep === 0} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <Button size="sm" onClick={handleNext} className="gap-1">
              {isLast ? (
                <>
                  <CheckCircle className="w-4 h-4" /> Complete
                </>
              ) : (
                <>
                  Next <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
