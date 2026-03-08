import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Circle, ArrowRight, LayoutDashboard, MessageSquare,
  Sparkles, Users, Wallet, Settings, Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'smartreach_onboarding_steps';

const steps = [
  { id: 1, title: 'Set up your business profile', description: 'Add your business name, logo, and contact details to get started.', icon: Settings, route: '/settings', duration: '2 min' },
  { id: 2, title: 'Connect your social channels', description: 'Link WhatsApp, Instagram, Facebook, and other messaging platforms.', icon: Share2, route: '/settings', duration: '5 min' },
  { id: 3, title: 'Explore the Social Inbox', description: 'Manage all customer conversations from one unified inbox.', icon: MessageSquare, route: '/inbox', duration: '3 min' },
  { id: 4, title: 'Create AI-powered marketing content', description: 'Use AI to generate social posts, emails, and ad copy instantly.', icon: Sparkles, route: '/marketing', duration: '5 min' },
  { id: 5, title: 'Invite your team', description: 'Add team members and assign roles to collaborate effectively.', icon: Users, route: '/settings', duration: '3 min' },
  { id: 6, title: 'Set up M-Pesa payments', description: 'Enable mobile payments to receive funds from your customers.', icon: Wallet, route: '/payments', duration: '5 min' },
];

export function GettingStartedGuide() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  }, [completed]);

  const toggleStep = (id: number) => {
    setCompleted(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const progress = Math.round((completed.length / steps.length) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-primary" />
              Getting Started Guide
            </CardTitle>
            <CardDescription className="mt-1">Complete these steps to set up your SmartReach AI workspace</CardDescription>
          </div>
          <Badge variant={progress === 100 ? 'default' : 'secondary'} className="text-sm">
            {completed.length}/{steps.length} completed
          </Badge>
        </div>
        <div className="w-full h-2 bg-muted rounded-full mt-4 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => {
            const done = completed.includes(step.id);
            return (
              <div
                key={step.id}
                className={cn(
                  'relative p-4 rounded-xl border transition-all cursor-pointer group',
                  done ? 'bg-primary/5 border-primary/20' : 'hover:border-primary/30 hover:shadow-sm'
                )}
                onClick={() => toggleStep(step.id)}
              >
                <div className="flex items-start gap-3">
                  <button className="mt-0.5 flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleStep(step.id); }}>
                    {done ? <CheckCircle className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn('font-medium text-sm', done && 'line-through text-muted-foreground')}>{step.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">{step.duration}</Badge>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary" onClick={(e) => { e.stopPropagation(); navigate(step.route); }}>
                        Go <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
