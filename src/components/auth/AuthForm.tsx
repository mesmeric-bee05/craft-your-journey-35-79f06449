import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [passwordValue, setPasswordValue] = useState('');
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  
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
      navigate('/dashboard');
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
    const { error } = await signUp(data.email, data.password, data.fullName);
    setLoading(false);
    if (!error) {
      navigate('/dashboard');
    }
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
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

        {/* Google Sign In */}
        <Button
          variant="outline"
          className="w-full mb-6 h-12 gap-3"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

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
              <div className="flex justify-end">
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
