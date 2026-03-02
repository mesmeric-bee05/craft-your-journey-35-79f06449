import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, ProductInsert } from '@/hooks/useProducts';
import { Supplier } from '@/hooks/useSuppliers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Product name is required').max(100, 'Max 100 characters'),
  sku: z.string().trim().max(50, 'Max 50 characters').optional().or(z.literal('')),
  category: z.enum(['fashion', 'food_beverage', 'electronics', 'beauty', 'general_merchandise', 'other']),
  buying_price: z.coerce.number().min(0, 'Must be non-negative'),
  selling_price: z.coerce.number().min(0, 'Must be non-negative'),
  current_stock: z.coerce.number().int('Must be a whole number').min(0, 'Must be non-negative'),
  reorder_level: z.coerce.number().int('Must be a whole number').min(0, 'Must be non-negative'),
  unit: z.string().min(1, 'Unit is required'),
  supplier_id: z.string().optional().or(z.literal('')),
});

type ProductFormValues = z.infer<typeof productSchema>;

const categories = [
  { value: 'fashion', label: 'Fashion' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'general_merchandise', label: 'General Merchandise' },
  { value: 'other', label: 'Other' },
];

const units = ['pieces', 'kgs', 'litres', 'metres', 'boxes', 'packs'];

interface AddEditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  suppliers: Supplier[];
  onSave: (data: ProductInsert) => Promise<any>;
  onUpdate?: (id: string, data: Partial<ProductInsert>) => Promise<boolean>;
}

export function AddEditProductDialog({ open, onOpenChange, product, suppliers, onSave, onUpdate }: AddEditProductDialogProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      sku: product?.sku || '',
      category: product?.category || 'other',
      buying_price: product?.buying_price ?? 0,
      selling_price: product?.selling_price ?? 0,
      current_stock: product?.current_stock ?? 0,
      reorder_level: product?.reorder_level ?? 5,
      unit: product?.unit || 'pieces',
      supplier_id: product?.supplier_id || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: product?.name || '',
        sku: product?.sku || '',
        category: product?.category || 'other',
        buying_price: product?.buying_price ?? 0,
        selling_price: product?.selling_price ?? 0,
        current_stock: product?.current_stock ?? 0,
        reorder_level: product?.reorder_level ?? 5,
        unit: product?.unit || 'pieces',
        supplier_id: product?.supplier_id || '',
      });
    }
  }, [open, product]);

  const buyNum = form.watch('buying_price') || 0;
  const sellNum = form.watch('selling_price') || 0;
  const margin = buyNum > 0 ? (((sellNum - buyNum) / buyNum) * 100).toFixed(1) : '—';

  const handleSubmit = async (values: ProductFormValues) => {
    const data: ProductInsert = {
      name: values.name,
      sku: values.sku || null,
      category: values.category,
      buying_price: values.buying_price,
      selling_price: values.selling_price,
      current_stock: values.current_stock,
      reorder_level: values.reorder_level,
      unit: values.unit,
      supplier_id: values.supplier_id || null,
      image_url: product?.image_url || null,
      is_active: true,
    };

    if (product && onUpdate) {
      await onUpdate(product.id, data);
    } else {
      await onSave(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name *</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. iPhone 15 Case" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="sku" render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. IP15-BLK-001" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="buying_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Buying Price (KES)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="selling_price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price (KES)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid gap-2">
                <Label>Margin</Label>
                <Input value={`${margin}%`} disabled className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="current_stock" render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Stock</FormLabel>
                  <FormControl><Input type="number" {...field} disabled={!!product} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="reorder_level" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder Level</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="supplier_id" render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select supplier (optional)" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : product ? 'Update' : 'Add Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
