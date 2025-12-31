import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBusiness } from '@/hooks/useBusiness';
import { Zap } from 'lucide-react';

interface RequireOnboardingProps {
  children: ReactNode;
}

export function RequireOnboarding({ children }: RequireOnboardingProps) {
  const { business, loading, hasCompletedOnboarding } = useBusiness();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-glow">
          <Zap className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  // If no business or onboarding not completed, redirect to onboarding
  if (!business || !hasCompletedOnboarding) {
    // Don't redirect if already on onboarding page
    if (location.pathname === '/onboarding') {
      return <>{children}</>;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
