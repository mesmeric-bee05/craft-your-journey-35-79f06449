import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product, ProductInsert } from '@/hooks/useProducts';
import { Supplier } from '@/hooks/useSuppliers';

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
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [category, setCategory] = useState<ProductInsert['category']>(product?.category || 'other');
  const [buyingPrice, setBuyingPrice] = useState(product?.buying_price?.toString() || '0');
  const [sellingPrice, setSellingPrice] = useState(product?.selling_price?.toString() || '0');
  const [currentStock, setCurrentStock] = useState(product?.current_stock?.toString() || '0');
  const [reorderLevel, setReorderLevel] = useState(product?.reorder_level?.toString() || '5');
  const [unit, setUnit] = useState(product?.unit || 'pieces');
  const [supplierId, setSupplierId] = useState(product?.supplier_id || '');
  const [saving, setSaving] = useState(false);

  const buyNum = parseFloat(buyingPrice) || 0;
  const sellNum = parseFloat(sellingPrice) || 0;
  const margin = buyNum > 0 ? (((sellNum - buyNum) / buyNum) * 100).toFixed(1) : '—';

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const data: ProductInsert = {
      name: name.trim(),
      sku: sku.trim() || null,
      category,
      buying_price: buyNum,
      selling_price: sellNum,
      current_stock: parseInt(currentStock) || 0,
      reorder_level: parseInt(reorderLevel) || 5,
      unit,
      supplier_id: supplierId || null,
      image_url: product?.image_url || null,
      is_active: true,
    };

    if (product && onUpdate) {
      await onUpdate(product.id, data);
    } else {
      await onSave(data);
    }
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Product Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. iPhone 15 Case" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>SKU</Label>
              <Input value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. IP15-BLK-001" />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ProductInsert['category'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Buying Price (KES)</Label>
              <Input type="number" value={buyingPrice} onChange={e => setBuyingPrice(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Selling Price (KES)</Label>
              <Input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Margin</Label>
              <Input value={`${margin}%`} disabled className="bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Current Stock</Label>
              <Input type="number" value={currentStock} onChange={e => setCurrentStock(e.target.value)} disabled={!!product} />
            </div>
            <div className="grid gap-2">
              <Label>Reorder Level</Label>
              <Input type="number" value={reorderLevel} onChange={e => setReorderLevel(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>{saving ? 'Saving...' : product ? 'Update' : 'Add Product'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
