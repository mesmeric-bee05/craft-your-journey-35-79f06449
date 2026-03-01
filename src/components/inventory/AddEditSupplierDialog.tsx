import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Supplier } from '@/hooks/useSuppliers';

interface AddEditSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSave: (data: Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdate?: (id: string, data: Partial<Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>>) => Promise<boolean>;
}

export function AddEditSupplierDialog({ open, onOpenChange, supplier, onSave, onUpdate }: AddEditSupplierDialogProps) {
  const [name, setName] = useState(supplier?.name || '');
  const [phone, setPhone] = useState(supplier?.phone || '');
  const [email, setEmail] = useState(supplier?.email || '');
  const [categories, setCategories] = useState(supplier?.product_categories?.join(', ') || '');
  const [notes, setNotes] = useState(supplier?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const data = {
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      product_categories: categories.split(',').map(c => c.trim()).filter(Boolean),
      notes: notes.trim() || null,
    };

    if (supplier && onUpdate) {
      await onUpdate(supplier.id, data);
    } else {
      await onSave(data);
    }
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{supplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Supplier Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Eastleigh Wholesalers" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254..." />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Product Categories</Label>
            <Input value={categories} onChange={e => setCategories(e.target.value)} placeholder="Fashion, Electronics (comma-separated)" />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>{saving ? 'Saving...' : supplier ? 'Update' : 'Add Supplier'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
