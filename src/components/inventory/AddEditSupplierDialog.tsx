import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Supplier } from '@/hooks/useSuppliers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const supplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(100, 'Max 100 characters'),
  phone: z.string().trim().max(20, 'Max 20 characters').optional().or(z.literal('')),
  email: z.string().trim().email('Invalid email').max(255).optional().or(z.literal('')),
  categories: z.string().max(500, 'Max 500 characters').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Max 1000 characters').optional().or(z.literal('')),
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

interface AddEditSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSave: (data: Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdate?: (id: string, data: Partial<Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>>) => Promise<boolean>;
}

export function AddEditSupplierDialog({ open, onOpenChange, supplier, onSave, onUpdate }: AddEditSupplierDialogProps) {
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name || '',
      phone: supplier?.phone || '',
      email: supplier?.email || '',
      categories: supplier?.product_categories?.join(', ') || '',
      notes: supplier?.notes || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: supplier?.name || '',
        phone: supplier?.phone || '',
        email: supplier?.email || '',
        categories: supplier?.product_categories?.join(', ') || '',
        notes: supplier?.notes || '',
      });
    }
  }, [open, supplier]);

  const handleSubmit = async (values: SupplierFormValues) => {
    const data = {
      name: values.name,
      phone: values.phone || null,
      email: values.email || null,
      product_categories: values.categories ? values.categories.split(',').map(c => c.trim()).filter(Boolean) : [],
      notes: values.notes || null,
    };

    if (supplier && onUpdate) {
      await onUpdate(supplier.id, data);
    } else {
      await onSave(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier Name *</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. Eastleigh Wholesalers" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} placeholder="+254..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} placeholder="email@example.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="categories" render={({ field }) => (
              <FormItem>
                <FormLabel>Product Categories</FormLabel>
                <FormControl><Input {...field} placeholder="Fashion, Electronics (comma-separated)" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea {...field} placeholder="Additional notes..." rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : supplier ? 'Update' : 'Add Supplier'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
