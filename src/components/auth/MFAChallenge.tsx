import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Shield, Loader2, Zap, ArrowLeft } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { useAuth } from '@/hooks/useAuth';

export function MFAChallenge() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyMFA, loading } = useMFA();
  const { signOut } = useAuth();
  
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setVerifying(true);
    setError('');

    const success = await verifyMFA(code);
    
    setVerifying(false);

    if (success) {
      navigate(from, { replace: true });
    } else {
      setError('Invalid verification code. Please try again.');
      setCode('');
    }
  };

  const handleCancel = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <Zap className="w-12 h-12 text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label className="text-center block">Verification Code</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  setError('');
                }}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>

          <Button 
            onClick={handleVerify} 
            className="w-full"
            disabled={code.length !== 6 || verifying}
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>

          <div className="text-center">
            <Button variant="ghost" onClick={handleCancel} className="text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Having trouble?</p>
            <p>Make sure your authenticator app's time is synced correctly.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
