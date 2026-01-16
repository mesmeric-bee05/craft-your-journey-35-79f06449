import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Shield, Smartphone, Check, Loader2, Copy, KeyRound } from 'lucide-react';
import { useMFA } from '@/hooks/useMFA';
import { useToast } from '@/hooks/use-toast';

interface EnrollmentData {
  id: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export function TwoFactorSetup() {
  const { isEnrolled, isVerified, loading, enrollMFA, verifyEnrollment, unenrollMFA } = useMFA();
  const { toast } = useToast();
  
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const handleStartEnrollment = async () => {
    const data = await enrollMFA();
    if (data) {
      setEnrollmentData(data);
      setEnrollDialogOpen(true);
    }
  };

  const handleVerifyCode = async () => {
    if (!enrollmentData || verificationCode.length !== 6) return;

    setVerifying(true);
    const success = await verifyEnrollment(enrollmentData.id, verificationCode);
    setVerifying(false);

    if (success) {
      setEnrollDialogOpen(false);
      setEnrollmentData(null);
      setVerificationCode('');
    }
  };

  const handleDisable2FA = async () => {
    await unenrollMFA();
  };

  const copySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
      toast({ title: 'Secret copied to clipboard' });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Two-Factor Authentication</CardTitle>
            </div>
            {isEnrolled && (
              <Badge variant="default" className="bg-green-500">
                <Check className="h-3 w-3 mr-1" />
                Enabled
              </Badge>
            )}
          </div>
          <CardDescription>
            Add an extra layer of security to your account using a time-based one-time password (TOTP)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEnrolled ? (
            <>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Smartphone className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-muted-foreground">
                      Your account is protected with 2FA
                    </p>
                  </div>
                </div>
                <Check className="h-5 w-5 text-green-500" />
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Manage Two-Factor Authentication</h4>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      Disable Two-Factor Authentication
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove the extra layer of security from your account. 
                        You can always re-enable it later.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisable2FA}>
                        Disable 2FA
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg border border-dashed">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <KeyRound className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Authenticator App</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Use an app like Google Authenticator, Authy, or 1Password to generate 
                      verification codes for signing in.
                    </p>
                    <Button onClick={handleStartEnrollment}>
                      <Shield className="h-4 w-4 mr-2" />
                      Set Up Authenticator
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="text-sm text-muted-foreground">
                <h4 className="font-medium text-foreground mb-2">Why use 2FA?</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Protects your account even if your password is compromised</li>
                  <li>Required for accessing sensitive account settings</li>
                  <li>Industry-standard security practice</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the verification code
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* QR Code */}
            {enrollmentData?.qrCode && (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-lg">
                  <img 
                    src={enrollmentData.qrCode} 
                    alt="QR Code for 2FA setup" 
                    className="w-48 h-48"
                  />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Can't scan? Enter this code manually:
                  </p>
                  <div className="flex items-center gap-2 justify-center">
                    <code className="px-3 py-1 bg-muted rounded text-sm font-mono">
                      {enrollmentData.secret}
                    </code>
                    <Button variant="ghost" size="icon" onClick={copySecret}>
                      {secretCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Verification Code Input */}
            <div className="space-y-4">
              <Label>Enter the 6-digit code from your app</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
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
            </div>

            <Button 
              onClick={handleVerifyCode} 
              className="w-full"
              disabled={verificationCode.length !== 6 || verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify and Enable'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
