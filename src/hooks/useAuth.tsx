import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
import { getPublicAppOrigin } from '@/lib/publicAppUrl';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string, redirectPath?: string) => Promise<{ error: AuthError | null; session: Session | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const configurationError = () =>
  ({
    name: 'SmartReachConfigurationError',
    message: 'Authentication is temporarily unavailable because the deployment is missing its Supabase configuration.',
  }) as AuthError;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Update last login time when user signs in
        if (event === 'SIGNED_IN' && session?.user) {
          const pending = sessionStorage.getItem('post_auth_next');
          if (pending && pending.startsWith('/') && !pending.startsWith('//')) {
            sessionStorage.removeItem('post_auth_next');
            if (window.location.pathname + window.location.search !== pending) window.location.assign(pending);
          }
          setTimeout(() => {
            supabase
              .from('profiles')
              .update({ last_login_at: new Date().toISOString() })
              .eq('user_id', session.user.id)
              .then(() => {});
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string, redirectPath?: string) => {
    if (!isSupabaseConfigured) {
      const error = configurationError();
      toast({ title: 'Sign up unavailable', description: error.message, variant: 'destructive' });
      return { error, session: null };
    }
    // A relative redirectPath (e.g. an OAuth consent URL) brings the user back
    // to where they started instead of the app home.
    const safePath = redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : '/';
    const redirectUrl = `${getPublicAppOrigin()}${safePath}`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName || '',
        },
      },
    });

    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } else if (!data.session) {
      toast({
        title: 'Check your email',
        description: 'Your account was created. Confirm your email address before signing in.',
      });
    } else {
      toast({
        title: 'Account created!',
        description: 'Welcome to SmartReach AI',
      });
    }

    return { error, session: data.session };
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const error = configurationError();
      toast({ title: 'Sign in unavailable', description: error.message, variant: 'destructive' });
      return { error };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      let message = error.message;
      if (error.message.includes('Invalid login credentials')) {
        message = 'Invalid email or password. Please try again.';
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        message = 'Please confirm your email address before signing in.';
      } else if (error.message.toLowerCase().includes('rate limit')) {
        message = 'Too many sign-in attempts. Please wait a moment and try again.';
      }
      toast({
        title: 'Sign in failed',
        description: message,
        variant: 'destructive',
      });
    }

    return { error };
  };

  const signInWithGoogle = async (redirectPath?: string) => {
    if (!isSupabaseConfigured) {
      const error = configurationError();
      toast({ title: 'Sign in unavailable', description: error.message, variant: 'destructive' });
      return { error };
    }
    const safePath = redirectPath && redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : '/';
    // Keep this marker even for the root destination. Some OAuth providers
    // consume the callback hash before React can inspect it; the app-level
    // callback guard uses this marker to finish the redirect reliably.
    sessionStorage.setItem('post_auth_next', safePath);
    // Preview deployments have no stable OAuth allow-list entry, so start the
    // flow on the canonical deployment.
    if (/\.vercel\.app$|\.netlify\.app$/.test(window.location.hostname)) {
      window.location.assign(`${getPublicAppOrigin()}/auth?next=${encodeURIComponent(safePath)}`);
      return { error: null };
    }
    // Supabase-native Google OAuth. The provider is configured in Supabase and
    // the callback returns straight to this deployment, so a provider that is
    // not enabled yet surfaces an actionable message instead of silently
    // dropping the user back on the landing page.
    const isLocalDev = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(window.location.origin);
    const callbackOrigin = isLocalDev ? window.location.origin : getPublicAppOrigin();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${callbackOrigin}/auth?next=${encodeURIComponent(safePath)}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      const providerDisabled = /provider is not enabled|unsupported provider/i.test(error.message);
      toast({
        title: 'Google sign in unavailable',
        description: providerDisabled
          ? 'Google sign-in has not been enabled for this deployment yet. Please sign in with your email and password.'
          : error.message,
        variant: 'destructive',
      });
    }
    return { error };
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) return;
    await supabase.auth.signOut();
    toast({
      title: 'Signed out',
      description: 'See you next time!',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
