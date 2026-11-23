import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { safeNextPath } from '@/lib/authRedirect';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { passwordSchema, getPasswordStrength, PASSWORD_MIN_LENGTH } from '@/lib/validation/password';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { checkRateLimit } from '@/lib/rateLimiter';
import { useToast } from '@/hooks/use-toast';
import { LovableMark } from '@lovable.dev/cloud-auth-js/react';

// SECURITY: Standardized password requirements across the app
const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// SECURITY: Stronger validation for signup
const signUpSchema = z.object({
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be under 100 characters')
    .transform(val => val.trim()),
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be under 255 characters')
    .transform(val => val.toLowerCase().trim()),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignInFormData = z.infer<typeof signInSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onModeChange: (mode: 'signin' | 'signup') => void;
}

export function AuthForm({ mode, onModeChange }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const nextPath = safeNextPath(location.search);
  
  
  // Password strength indicator for signup
  const passwordStrength = mode === 'signup' ? getPasswordStrength(passwordValue) : null;

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  });

  const { toast: toastFn } = useToast();

  const handleSignIn = async (data: SignInFormData) => {
    // SECURITY: Client-side rate limiting - 5 attempts per minute
    const rl = checkRateLimit('auth-signin', 5, 60_000);
    if (!rl.allowed) {
      toastFn({ title: 'Too many attempts', description: `Please wait ${Math.ceil(rl.retryAfterMs / 1000)} seconds.`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signIn(data.email, data.password);
    setLoading(false);
    setSignInFailed(!!error);
    if (error) {
      // SECURITY: Log failed login attempt via audit log
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        await supabase.rpc('log_security_event', {
          p_action: 'login_failed',
          p_entity_type: 'auth',
          p_metadata: { email: data.email, reason: error.message },
        });
      } catch {
        // Audit logging is best-effort; don't block the user
      }
    } else {
      navigate(nextPath);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    // SECURITY: Client-side rate limiting - 3 attempts per minute
    const rl = checkRateLimit('auth-signup', 3, 60_000);
    if (!rl.allowed) {
      toastFn({ title: 'Too many attempts', description: `Please wait ${Math.ceil(rl.retryAfterMs / 1000)} seconds.`, variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error, session } = await signUp(data.email, data.password, data.fullName, nextPath);
    setLoading(false);
    if (!error && session) {
      navigate(nextPath);
    }
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle(nextPath);
  };

  const handleLovableSignIn = async () => {
    const safe = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
    sessionStorage.setItem('post_auth_next', safe);
    const { lovable } = await import('@/integrations/lovable/index');
    const result = await lovable.auth.signInWithOAuth('lovable', { redirect_uri: window.location.origin });
    if (result.error) {
      toastFn({ title: 'Lovable sign in failed', description: String((result.error as Error).message ?? result.error), variant: 'destructive' });
      return;
    }
    if (!result.redirected) navigate(safe);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass rounded-2xl p-8 shadow-medium animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'signin'
              ? 'Sign in to access your dashboard'
              : 'Start your journey with SmartReach AI'}
          </p>
        </div>

        {/* Social sign in */}
        <div className="mb-6 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-[10px] px-3 border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F2F2F2] hover:text-[#1F1F1F] dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3] dark:hover:bg-[#1f1f20] dark:hover:text-[#E3E3E3] font-medium text-sm"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg aria-hidden="true" width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-[10px]"
            onClick={handleLovableSignIn}
            disabled={loading}
          >
            <LovableMark className="h-[18px] w-[18px]" />
            Continue with Lovable
          </Button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...signInForm.register('email')}
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10 h-12"
                />
              </div>
              {signInForm.formState.errors.email && (
                <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...signInForm.register('password')}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {signInForm.formState.errors.password && (
                <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                {signInFailed ? (
                  <p className="text-xs text-muted-foreground">Can't remember it? Reset your password →</p>
                ) : <span />}
                <ForgotPasswordDialog />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...signUpForm.register('fullName')}
                  id="fullName"
                  placeholder="John Doe"
                  className="pl-10 h-12"
                />
              </div>
              {signUpForm.formState.errors.fullName && (
                <p className="text-sm text-destructive">{signUpForm.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...signUpForm.register('email')}
                  id="signup-email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10 h-12"
                />
              </div>
              {signUpForm.formState.errors.email && (
                <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...signUpForm.register('password', {
                    onChange: (e) => setPasswordValue(e.target.value)
                  })}
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {signUpForm.formState.errors.password && (
                <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>
              )}
              {/* Password strength indicator */}
              {passwordValue && passwordStrength && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          'h-1 flex-1 rounded',
                          level <= passwordStrength.score
                            ? passwordStrength.score <= 1
                              ? 'bg-destructive'
                              : passwordStrength.score <= 2
                              ? 'bg-yellow-500'
                              : passwordStrength.score <= 3
                              ? 'bg-blue-500'
                              : 'bg-green-500'
                            : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                  <p className={cn(
                    'text-xs',
                    passwordStrength.score <= 1 ? 'text-destructive' :
                    passwordStrength.score <= 2 ? 'text-yellow-600' :
                    passwordStrength.score <= 3 ? 'text-blue-600' : 'text-green-600'
                  )}>
                    Password strength: {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  {...signUpForm.register('confirmPassword')}
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 h-12"
                />
              </div>
              {signUpForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{signUpForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* Toggle Mode */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => onModeChange('signup')}
                className="font-medium text-primary hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onModeChange('signin')}
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
