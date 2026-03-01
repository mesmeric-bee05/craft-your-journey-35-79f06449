import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryKPICards } from '@/components/inventory/InventoryKPICards';
import { ProductsTab } from '@/components/inventory/ProductsTab';
import { LowStockAlerts } from '@/components/inventory/LowStockAlerts';
import { StockMovementsTab } from '@/components/inventory/StockMovementsTab';
import { SuppliersTab } from '@/components/inventory/SuppliersTab';
import { AddEditProductDialog } from '@/components/inventory/AddEditProductDialog';
import { AdjustStockDialog } from '@/components/inventory/AdjustStockDialog';
import { useProducts, Product } from '@/hooks/useProducts';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useStockMovements } from '@/hooks/useStockMovements';
import { Skeleton } from '@/components/ui/skeleton';

export default function Inventory() {
  const { products, loading: productsLoading, totalProducts, totalStockValue, lowStockProducts, stockoutProducts, createProduct, updateProduct, deleteProduct, adjustStock } = useProducts();
  const { suppliers, loading: suppliersLoading, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const { movements, loading: movementsLoading } = useStockMovements();

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null);

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductDialogOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setProductDialogOpen(true);
  };

  const loading = productsLoading || suppliersLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Inventory Intelligence</h1>
          <p className="text-muted-foreground">Track stock levels, manage products, and prevent stockouts.</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <InventoryKPICards
            totalProducts={totalProducts}
            totalStockValue={totalStockValue}
            lowStockCount={lowStockProducts.length}
            stockoutCount={stockoutProducts.length}
          />
        )}

        <Tabs defaultValue="products">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="low-stock">
              Low Stock
              {lowStockProducts.length > 0 && (
                <span className="ml-1.5 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5">
                  {lowStockProducts.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductsTab
              products={products}
              suppliers={suppliers}
              onAddProduct={handleAddProduct}
              onEditProduct={handleEditProduct}
              onDeleteProduct={deleteProduct}
              onAdjustStock={setAdjustProduct}
            />
          </TabsContent>

          <TabsContent value="low-stock">
            <LowStockAlerts products={products} suppliers={suppliers} onAdjustStock={setAdjustProduct} />
          </TabsContent>

          <TabsContent value="movements">
            <StockMovementsTab movements={movements} products={products} loading={movementsLoading} />
          </TabsContent>

          <TabsContent value="suppliers">
            <SuppliersTab
              suppliers={suppliers}
              onCreateSupplier={createSupplier}
              onUpdateSupplier={updateSupplier}
              onDeleteSupplier={deleteSupplier}
            />
          </TabsContent>
        </Tabs>

        <AddEditProductDialog
          open={productDialogOpen}
          onOpenChange={setProductDialogOpen}
          product={editingProduct}
          suppliers={suppliers}
          onSave={createProduct}
          onUpdate={updateProduct}
        />

        <AdjustStockDialog
          open={!!adjustProduct}
          onOpenChange={(open) => !open && setAdjustProduct(null)}
          product={adjustProduct}
          onAdjust={adjustStock}
        />
      </div>
    </DashboardLayout>
  );
}
