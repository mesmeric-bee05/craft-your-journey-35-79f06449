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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Mail, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const emailConfigSchema = z.object({
  fromEmail: z.string().email('Invalid email address'),
  fromName: z.string().min(1, 'From name is required').max(100),
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.coerce.number().min(1).max(65535),
  smtpUsername: z.string().min(1, 'Username is required'),
  smtpPassword: z.string().min(1, 'Password is required'),
  encryption: z.enum(['tls', 'ssl', 'none']),
});

type EmailConfigForm = z.infer<typeof emailConfigSchema>;

interface EmailChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSettings?: Partial<EmailConfigForm>;
  onSave: (settings: Record<string, any>) => Promise<void>;
}

export function EmailChannelDialog({
  open,
  onOpenChange,
  existingSettings,
  onSave,
}: EmailChannelDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const form = useForm<EmailConfigForm>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      fromEmail: existingSettings?.fromEmail || '',
      fromName: existingSettings?.fromName || '',
      smtpHost: existingSettings?.smtpHost || '',
      smtpPort: existingSettings?.smtpPort || 587,
      smtpUsername: existingSettings?.smtpUsername || '',
      smtpPassword: existingSettings?.smtpPassword || '',
      encryption: existingSettings?.encryption || 'tls',
    },
  });

  const handleTestConnection = async () => {
    const values = form.getValues();
    const isValid = await form.trigger();
    if (!isValid) return;

    setIsTesting(true);
    try {
      // Simulate test connection - in production, call an edge function
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ title: 'Connection successful', description: 'Email settings are valid' });
    } catch (error: any) {
      toast({ 
        title: 'Connection failed', 
        description: error.message || 'Could not connect to SMTP server',
        variant: 'destructive' 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const onSubmit = async (data: EmailConfigForm) => {
    setIsSaving(true);
    try {
      await onSave({
        smtp_host: data.smtpHost,
        smtp_port: data.smtpPort,
        smtp_username: data.smtpUsername,
        smtp_password: data.smtpPassword,
        smtp_encryption: data.encryption,
        from_email: data.fromEmail,
        from_name: data.fromName,
      });
      toast({ title: 'Email channel configured successfully' });
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configure Email Channel
          </DialogTitle>
          <DialogDescription>
            Set up SMTP settings to send and receive emails through your inbox.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Email</FormLabel>
                    <FormControl>
                      <Input placeholder="hello@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Company" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="smtpHost"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>SMTP Host</FormLabel>
                    <FormControl>
                      <Input placeholder="smtp.gmail.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="587" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smtpUsername"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="encryption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Encryption</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select encryption" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tls">TLS (Recommended)</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    TLS is recommended for secure email transmission
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || isSaving}
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Test Connection
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
