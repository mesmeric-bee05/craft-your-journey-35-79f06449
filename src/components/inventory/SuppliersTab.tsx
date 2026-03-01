import { useState } from 'react';
import { Supplier } from '@/hooks/useSuppliers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { AddEditSupplierDialog } from './AddEditSupplierDialog';

interface SuppliersTabProps {
  suppliers: Supplier[];
  onCreateSupplier: (data: Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateSupplier: (id: string, data: Partial<Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>>) => Promise<boolean>;
  onDeleteSupplier: (id: string) => Promise<boolean>;
}

export function SuppliersTab({ suppliers, onCreateSupplier, onUpdateSupplier, onDeleteSupplier }: SuppliersTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingSupplier(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" /> Add Supplier</Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-semibold mb-2">No suppliers yet</p>
          <p className="text-muted-foreground mb-4">Add suppliers to link them to your products.</p>
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" /> Add Your First Supplier</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map(supplier => (
            <Card key={supplier.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="font-semibold">{supplier.name}</p>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(supplier)}><Edit className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDeleteSupplier(supplier.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3 h-3" /> {supplier.phone}
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3 h-3" /> {supplier.email}
                    </div>
                  )}
                </div>
                {supplier.product_categories?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {supplier.product_categories.map(cat => (
                      <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                    ))}
                  </div>
                )}
                {supplier.notes && <p className="text-xs text-muted-foreground italic">{supplier.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddEditSupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={editingSupplier}
        onSave={onCreateSupplier}
        onUpdate={onUpdateSupplier}
      />
    </div>
  );
}
