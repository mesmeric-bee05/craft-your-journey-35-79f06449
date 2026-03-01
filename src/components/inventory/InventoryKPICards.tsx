import { Package, DollarSign, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface InventoryKPICardsProps {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  stockoutCount: number;
}

export function InventoryKPICards({ totalProducts, totalStockValue, lowStockCount, stockoutCount }: InventoryKPICardsProps) {
  const kpis = [
    { label: 'Total Products', value: totalProducts.toString(), icon: Package, color: 'text-primary' },
    { label: 'Stock Value (KES)', value: totalStockValue.toLocaleString('en-KE'), icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Low Stock Alerts', value: lowStockCount.toString(), icon: AlertTriangle, color: 'text-amber-500' },
    { label: 'Stockout Products', value: stockoutCount.toString(), icon: XCircle, color: 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-muted ${kpi.color}`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
