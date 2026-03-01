import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Product } from '@/hooks/useProducts';
import { Badge } from '@/components/ui/badge';

interface AdjustStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onAdjust: (productId: string, quantityChange: number, movementType: 'sale' | 'restock' | 'adjustment' | 'loss', note?: string) => Promise<boolean>;
}

export function AdjustStockDialog({ open, onOpenChange, product, onAdjust }: AdjustStockDialogProps) {
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState<'sale' | 'restock' | 'adjustment' | 'loss'>('restock');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  if (!product) return null;

  const qtyNum = parseInt(quantity) || 0;
  const change = type === 'restock' || type === 'adjustment' ? qtyNum : -qtyNum;
  const newStock = product.current_stock + change;

  const handleSubmit = async () => {
    if (qtyNum <= 0) return;
    setSaving(true);
    const success = await onAdjust(product.id, change, type, note || undefined);
    setSaving(false);
    if (success) {
      setQuantity('');
      setNote('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock — {product.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <span className="text-sm text-muted-foreground">Current Stock</span>
            <Badge variant={product.current_stock <= product.reorder_level ? "destructive" : "secondary"} className="text-lg px-3">
              {product.current_stock} {product.unit}
            </Badge>
          </div>
          <div className="grid gap-2">
            <Label>Movement Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="restock">Restock (+)</SelectItem>
                <SelectItem value="sale">Sale (−)</SelectItem>
                <SelectItem value="adjustment">Adjustment (+)</SelectItem>
                <SelectItem value="loss">Loss (−)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Quantity</Label>
            <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Enter quantity" />
          </div>
          {qtyNum > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">New Stock</span>
              <span className={`text-lg font-bold ${newStock <= product.reorder_level ? 'text-destructive' : 'text-emerald-500'}`}>{newStock} {product.unit}</span>
            </div>
          )}
          <div className="grid gap-2">
            <Label>Note (optional)</Label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for adjustment..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || qtyNum <= 0 || newStock < 0}>
            {saving ? 'Saving...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
