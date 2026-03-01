import { StockMovement } from '@/hooks/useStockMovements';
import { Product } from '@/hooks/useProducts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const movementConfig: Record<string, { label: string; icon: typeof ArrowUp; color: string }> = {
  restock: { label: 'Restock', icon: ArrowUp, color: 'text-emerald-500 bg-emerald-500/10' },
  sale: { label: 'Sale', icon: ArrowDown, color: 'text-blue-500 bg-blue-500/10' },
  adjustment: { label: 'Adjustment', icon: RefreshCw, color: 'text-amber-500 bg-amber-500/10' },
  loss: { label: 'Loss', icon: AlertTriangle, color: 'text-destructive bg-destructive/10' },
};

interface StockMovementsTabProps {
  movements: StockMovement[];
  products: Product[];
  loading: boolean;
}

export function StockMovementsTab({ movements, products, loading }: StockMovementsTabProps) {
  if (loading) {
    return <div className="flex justify-center py-16"><p className="text-muted-foreground">Loading movements...</p></div>;
  }

  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-semibold mb-2">No stock movements yet</p>
        <p className="text-muted-foreground">Movements will appear here when you adjust product stock.</p>
      </div>
    );
  }

  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-3">
      {movements.map(movement => {
        const config = movementConfig[movement.movement_type] || movementConfig.adjustment;
        const Icon = config.icon;
        return (
          <div key={movement.id} className="flex items-start gap-4 p-4 border rounded-xl">
            <div className={cn("p-2 rounded-lg", config.color)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{getProductName(movement.product_id)}</span>
                <Badge variant="outline">{config.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {movement.previous_stock} → {movement.new_stock} ({movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change})
              </p>
              {movement.note && <p className="text-sm text-muted-foreground mt-1 italic">"{movement.note}"</p>}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(movement.created_at), 'MMM d, HH:mm')}
            </span>
          </div>
        );
      })}
    </div>
  );
}
