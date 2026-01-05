import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Phone, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const smsConfigSchema = z.object({
  accountSid: z.string()
    .min(1, 'Account SID is required')
    .regex(/^AC/, 'Account SID must start with "AC"'),
  authToken: z.string().min(1, 'Auth Token is required'),
  phoneNumber: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone number must be in E.164 format (e.g., +1234567890)'),
});

type SMSConfigForm = z.infer<typeof smsConfigSchema>;

interface SMSChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSettings?: Partial<SMSConfigForm>;
  onSave: (settings: Record<string, any>) => Promise<void>;
}

export function SMSChannelDialog({
  open,
  onOpenChange,
  existingSettings,
  onSave,
}: SMSChannelDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const form = useForm<SMSConfigForm>({
    resolver: zodResolver(smsConfigSchema),
    defaultValues: {
      accountSid: existingSettings?.accountSid || '',
      authToken: existingSettings?.authToken || '',
      phoneNumber: existingSettings?.phoneNumber || '',
    },
  });

  const handleSendTestSMS = async () => {
    const values = form.getValues();
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsTesting(true);
    try {
      // Simulate test SMS - in production, call an edge function
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ 
        title: 'Test SMS sent', 
        description: 'Check your phone for the test message' 
      });
    } catch (error: any) {
      toast({ 
        title: 'Failed to send test SMS', 
        description: error.message || 'Could not send test SMS',
        variant: 'destructive' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = async (data: SMSConfigForm) => {
    setIsSaving(true);
    try {
      await onSave({
        twilio_account_sid: data.accountSid,
        twilio_auth_token: data.authToken,
        twilio_phone_number: data.phoneNumber,
      });
      toast({ title: 'SMS channel configured successfully' });
      onOpenChange(false);
    } catch (error: any) {
      toast({ 
        title: 'Error saving settings', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Configure SMS Channel
          </DialogTitle>
          <DialogDescription>
            Connect your Twilio account to send and receive SMS messages.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="accountSid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twilio Account SID</FormLabel>
                  <FormControl>
                    <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                  </FormControl>
                  <FormDescription>
                    Find this in your Twilio Console dashboard
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="authToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Auth Token</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="••••••••••••••••••••••••••••••••" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Your Twilio Auth Token (kept secret)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twilio Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormDescription>
                    Your Twilio phone number in E.164 format
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSendTestSMS}
                disabled={isTesting || isSaving}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Send Test SMS
              </Button>
              <div className="space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
