import { Product } from '@/hooks/useProducts';
import { Supplier } from '@/hooks/useSuppliers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, MessageCircle, Phone } from 'lucide-react';

interface LowStockAlertsProps {
  products: Product[];
  suppliers: Supplier[];
  onAdjustStock: (product: Product) => void;
}

export function LowStockAlerts({ products, suppliers, onAdjustStock }: LowStockAlertsProps) {
  const lowStock = products.filter(p => p.current_stock <= p.reorder_level && p.is_active);

  if (lowStock.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">All stock levels are healthy</h3>
        <p className="text-muted-foreground">No products are below their reorder level.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lowStock.map(product => {
        const supplier = suppliers.find(s => s.id === product.supplier_id);
        const isStockout = product.current_stock === 0;
        return (
          <Card key={product.id} className={`border-2 ${isStockout ? 'border-destructive' : 'border-amber-400'}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sku || 'No SKU'}</p>
                </div>
                <Badge variant="destructive" className="text-lg px-3">
                  {product.current_stock}
                </Badge>
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reorder Level</span>
                  <span>{product.reorder_level} {product.unit}</span>
                </div>
                {supplier && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier</span>
                    <span>{supplier.name}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={() => onAdjustStock(product)}>Restock</Button>
                {supplier?.phone && (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`https://wa.me/${supplier.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-3 h-3" />
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${supplier.phone}`}>
                        <Phone className="w-3 h-3" />
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
