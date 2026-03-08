import { useMemo } from 'react';
import { Zap, TrendingUp, MessageSquare, Users, Wallet, Package, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreCategory {
  label: string;
  score: number;
  maxScore: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface SmartReachScoreProps {
  totalMessages: number;
  activeCustomers: number;
  totalRevenue: number;
  csatScore: number;
  resolvedToday: number;
  openConversations: number;
  loading?: boolean;
}

function calculateScore(props: SmartReachScoreProps): { total: number; categories: ScoreCategory[] } {
  // Engagement: based on messages and response activity
  const engagementScore = Math.min(
    Math.round((props.totalMessages / 50) * 25 + (props.resolvedToday / 5) * 25),
    25
  );

  // Customer Health: based on active customers and CSAT
  const csatNorm = props.csatScore > 0 ? (props.csatScore / 5) * 12.5 : 0;
  const customerNorm = Math.min((props.activeCustomers / 20) * 12.5, 12.5);
  const customerScore = Math.min(Math.round(csatNorm + customerNorm), 25);

  // Revenue Activity: based on revenue
  const revenueScore = Math.min(Math.round((props.totalRevenue / 50000) * 25), 25);

  // Operational Efficiency: based on open vs resolved ratio
  const total = props.openConversations + props.resolvedToday;
  const efficiencyRatio = total > 0 ? props.resolvedToday / total : 0;
  const operationalScore = Math.round(efficiencyRatio * 25);

  const categories: ScoreCategory[] = [
    { label: 'Engagement', score: engagementScore, maxScore: 25, icon: MessageSquare, color: 'text-blue-500' },
    { label: 'Customer Health', score: customerScore, maxScore: 25, icon: Users, color: 'text-emerald-500' },
    { label: 'Revenue', score: revenueScore, maxScore: 25, icon: Wallet, color: 'text-amber-500' },
    { label: 'Operations', score: operationalScore, maxScore: 25, icon: Shield, color: 'text-purple-500' },
  ];

  return {
    total: categories.reduce((sum, c) => sum + c.score, 0),
    categories,
  };
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Excellent', color: 'text-emerald-500' };
  if (score >= 60) return { label: 'Good', color: 'text-blue-500' };
  if (score >= 40) return { label: 'Growing', color: 'text-amber-500' };
  return { label: 'Getting Started', color: 'text-muted-foreground' };
}

export function SmartReachScore(props: SmartReachScoreProps) {
  const { total, categories } = useMemo(() => calculateScore(props), [props]);
  const { label, color } = getScoreLabel(total);

  if (props.loading) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-4" />
        <div className="h-16 w-16 bg-muted rounded-full mx-auto mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-3 bg-muted rounded" />)}
        </div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 42;
  const strokeOffset = circumference - (total / 100) * circumference;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50">
      <div className="flex items-center gap-2 mb-5">
        <Zap className="w-5 h-5 text-accent" />
        <h3 className="text-lg font-display font-semibold text-foreground">SmartReach Score</h3>
      </div>

      {/* Circular Score */}
      <div className="flex justify-center mb-5">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6"
              className="stroke-muted" />
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              className="stroke-accent transition-all duration-1000 ease-out" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-display font-bold text-foreground">{total}</span>
            <span className={cn('text-xs font-medium', color)}>{label}</span>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.label} className="flex items-center gap-3">
            <cat.icon className={cn('w-4 h-4 flex-shrink-0', cat.color)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">{cat.label}</span>
                <span className="font-medium text-foreground">{cat.score}/{cat.maxScore}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: `${(cat.score / cat.maxScore) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Score updates with your weekly activity</span>
        </div>
      </div>
    </div>
  );
}
