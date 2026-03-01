import { useState } from 'react';
import { Product } from '@/hooks/useProducts';
import { Supplier } from '@/hooks/useSuppliers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Edit, Trash2, PackagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryLabels: Record<string, string> = {
  fashion: 'Fashion',
  food_beverage: 'Food & Beverage',
  electronics: 'Electronics',
  beauty: 'Beauty',
  general_merchandise: 'General',
  other: 'Other',
};

interface ProductsTabProps {
  products: Product[];
  suppliers: Supplier[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAdjustStock: (product: Product) => void;
}

export function ProductsTab({ products, suppliers, onAddProduct, onEditProduct, onDeleteProduct, onAdjustStock }: ProductsTabProps) {
  const [search, setSearch] = useState('');

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const getSupplierName = (id: string | null) => suppliers.find(s => s.id === id)?.name || '—';
  const getMargin = (buy: number, sell: number) => buy > 0 ? (((sell - buy) / buy) * 100).toFixed(1) : '—';

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <PackagePlus className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Your inventory is empty</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">Start by adding your first product to track stock levels, prices, and margins.</p>
        <Button onClick={onAddProduct}>
          <Plus className="w-4 h-4 mr-2" /> Add Your First Product
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={onAddProduct}><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
      </div>

      {/* Mobile cards */}
      <div className="block lg:hidden space-y-3">
        {filtered.map(product => {
          const isLow = product.current_stock <= product.reorder_level;
          return (
            <div key={product.id} className={cn("border rounded-xl p-4 space-y-3", isLow && "border-destructive/50 bg-destructive/5")}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.sku || 'No SKU'}</p>
                </div>
                <Badge variant={isLow ? "destructive" : "secondary"}>{product.current_stock} {product.unit}</Badge>
              </div>
              <div className="flex gap-2 text-sm text-muted-foreground">
                <span>Buy: KES {product.buying_price.toLocaleString()}</span>
                <span>•</span>
                <span>Sell: KES {product.selling_price.toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onAdjustStock({ ...product })}>
                  <PackagePlus className="w-3 h-3 mr-1" /> Adjust Stock
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onEditProduct(product)}><Edit className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDeleteProduct(product.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block rounded-xl border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Buy (KES)</TableHead>
              <TableHead className="text-right">Sell (KES)</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(product => {
              const isLow = product.current_stock <= product.reorder_level;
              return (
                <TableRow key={product.id} className={cn(isLow && "bg-destructive/5")}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground">{product.sku || '—'}</TableCell>
                  <TableCell><Badge variant="outline">{categoryLabels[product.category]}</Badge></TableCell>
                  <TableCell className={cn("text-right font-semibold", isLow && "text-destructive")}>{product.current_stock}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{product.reorder_level}</TableCell>
                  <TableCell className="text-right">{product.buying_price.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{product.selling_price.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{getMargin(product.buying_price, product.selling_price)}%</TableCell>
                  <TableCell className="text-muted-foreground">{getSupplierName(product.supplier_id)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onAdjustStock(product)}><PackagePlus className="w-4 h-4 mr-2" /> Adjust Stock</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditProduct(product)}><Edit className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDeleteProduct(product.id)} className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
