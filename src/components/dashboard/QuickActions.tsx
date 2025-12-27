import { Link } from 'react-router-dom';
import {
  MessageSquarePlus,
  PenTool,
  UserPlus,
  CreditCard,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  gradient: string;
}

const quickActions: QuickAction[] = [
  {
    label: 'New Conversation',
    description: 'Start chatting with customers',
    icon: MessageSquarePlus,
    href: '/inbox',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    label: 'Create Content',
    description: 'AI-powered marketing copy',
    icon: PenTool,
    href: '/marketing',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    label: 'Post a Job',
    description: 'Find talent for your business',
    icon: UserPlus,
    href: '/talent',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    label: 'Send Payment',
    description: 'Pay via M-Pesa or wallet',
    icon: CreditCard,
    href: '/payments',
    gradient: 'from-orange-500 to-amber-500',
  },
];

export function QuickActions() {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft border border-border/50">
      <h3 className="text-lg font-display font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            to={action.href}
            className="group flex items-center gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all"
          >
            <div className={cn('p-3 rounded-xl bg-gradient-to-br text-white', action.gradient)}>
              <action.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                {action.label}
              </p>
              <p className="text-sm text-muted-foreground truncate">{action.description}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>
    </div>
  );
}
