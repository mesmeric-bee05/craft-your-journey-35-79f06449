import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMFA } from '@/hooks/useMFA';
import { Zap } from 'lucide-react';

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const { isEnrolled, isVerified, loading: mfaLoading } = useMFA();
  const location = useLocation();

  // Don't redirect to MFA if we're already on the MFA challenge page
  const isOnMFAChallenge = location.pathname === '/mfa-challenge';

  if (loading || mfaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-glow">
          <Zap className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If MFA is enrolled but not verified for this session, redirect to challenge
  // Skip this check if already on MFA challenge page to prevent redirect loop
  if (!isOnMFAChallenge && isEnrolled && !isVerified) {
    return <Navigate to="/mfa-challenge" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
