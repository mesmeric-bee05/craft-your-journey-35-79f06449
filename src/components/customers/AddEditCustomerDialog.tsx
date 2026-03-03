import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Customer } from '@/hooks/useCustomers';
import { useEffect } from 'react';

const customerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email').max(255).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  channel_type: z.string().min(1),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
  tags: z.string().trim().max(500).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof customerSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null;
  onSave: (data: Partial<Customer>) => Promise<void>;
}

export function AddEditCustomerDialog({ open, onOpenChange, customer, onSave }: Props) {
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      channel_type: 'whatsapp',
      notes: '',
      tags: '',
    },
  });

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        channel_type: customer.channel_type,
        notes: customer.notes || '',
        tags: (customer.tags || []).join(', '),
      });
    } else {
      reset({ name: '', email: '', phone: '', channel_type: 'whatsapp', notes: '', tags: '' });
    }
  }, [customer, reset]);

  const onSubmit = async (values: FormValues) => {
    const tags = values.tags
      ? values.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    await onSave({
      name: values.name,
      email: values.email || null,
      phone: values.phone || null,
      channel_type: values.channel_type as any,
      notes: values.notes || null,
      tags,
    } as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {customer ? 'Update customer details.' : 'Add a new customer to your CRM.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input {...register('name')} placeholder="Customer name" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input {...register('email')} type="email" placeholder="email@example.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register('phone')} placeholder="+254 7XX XXX XXX" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Channel</Label>
            <Select
              defaultValue={customer?.channel_type || 'whatsapp'}
              onValueChange={(v) => setValue('channel_type', v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input {...register('tags')} placeholder="vip, repeat-buyer, lagos" />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...register('notes')} placeholder="Internal notes about this customer..." rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : customer ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
