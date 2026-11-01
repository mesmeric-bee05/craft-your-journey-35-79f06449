import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { safeNextPath } from '@/lib/authRedirect';
import { Zap } from 'lucide-react';

export default function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Prefer an explicit ?next= param, then the blocked route saved in state.
  const fromState = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
  const stateNext = fromState?.pathname?.startsWith('/') && !fromState.pathname.startsWith('//')
    ? `${fromState.pathname}${fromState.search ?? ''}`
    : undefined;
  const next = safeNextPath(location.search, stateNext ?? '/dashboard');

  useEffect(() => {
    if (!loading && user) {
      navigate(next);
    }
  }, [user, loading, navigate, next]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-glow">
          <Zap className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-dark relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center">
              <Zap className="w-7 h-7" />
            </div>
            <span className="text-2xl font-display font-bold">SmartReach AI</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-display font-bold leading-tight mb-6">
            Empowering African SMEs with{' '}
            <span className="text-gradient-accent">AI-Powered</span> Growth
          </h1>
          
          <p className="text-lg text-gray-100 mb-8 max-w-lg">
            Unified social commerce, intelligent marketing, talent marketplace, and embedded finance - all in one platform.
          </p>
          
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="glass-dark rounded-xl p-4">
              <div className="text-2xl font-bold text-accent">50K+</div>
              <div className="text-sm text-gray-200">Active SMEs</div>
            </div>
            <div className="glass-dark rounded-xl p-4">
              <div className="text-2xl font-bold text-success">$2M+</div>
              <div className="text-sm text-gray-200">Transactions</div>
            </div>
            <div className="glass-dark rounded-xl p-4">
              <div className="text-2xl font-bold text-primary">6</div>
              <div className="text-sm text-gray-200">Social Channels</div>
            </div>
            <div className="glass-dark rounded-xl p-4">
              <div className="text-2xl font-bold text-warning">10K+</div>
              <div className="text-sm text-gray-200">Freelancers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold">SmartReach AI</span>
          </div>
          
          <AuthForm mode={mode} onModeChange={setMode} />
        </div>
      </div>
    </div>
  );
}
