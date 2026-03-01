import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Product {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  category: 'fashion' | 'food_beverage' | 'electronics' | 'beauty' | 'general_merchandise' | 'other';
  buying_price: number;
  selling_price: number;
  current_stock: number;
  reorder_level: number;
  unit: string;
  supplier_id: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductInsert = Omit<Product, 'id' | 'business_id' | 'created_at' | 'updated_at'>;

export function useProducts() {
  const { business, loading: businessLoading } = useBusiness();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (businessLoading) return;
    if (!business?.id) { setProducts([]); setLoading(false); return; }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id)
        .order('name');

      if (error) throw error;
      setProducts((data || []) as Product[]);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [business?.id, businessLoading]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const createProduct = async (product: ProductInsert) => {
    if (!business?.id) return null;
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, business_id: business.id })
        .select()
        .single();
      if (error) throw error;
      const newProduct = data as Product;
      setProducts(prev => [...prev, newProduct].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Product added');
      return newProduct;
    } catch (err) {
      toast.error('Failed to add product');
      return null;
    }
  };

  const updateProduct = async (id: string, updates: Partial<ProductInsert>) => {
    try {
      const { error } = await supabase.from('products').update(updates).eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      toast.success('Product updated');
      return true;
    } catch (err) {
      toast.error('Failed to update product');
      return false;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete product');
      return false;
    }
  };

  const adjustStock = async (productId: string, quantityChange: number, movementType: 'sale' | 'restock' | 'adjustment' | 'loss', note?: string) => {
    if (!business?.id || !user?.id) return false;
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    const previousStock = product.current_stock;
    const newStock = previousStock + quantityChange;

    try {
      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ current_stock: newStock })
        .eq('id', productId);
      if (updateError) throw updateError;

      // Insert stock movement
      const { error: moveError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: productId,
          business_id: business.id,
          movement_type: movementType,
          quantity_change: quantityChange,
          previous_stock: previousStock,
          new_stock: newStock,
          note: note || null,
          created_by: user.id,
        });
      if (moveError) throw moveError;

      setProducts(prev => prev.map(p => p.id === productId ? { ...p, current_stock: newStock } : p));
      toast.success('Stock updated');

      // Low stock alert
      if (newStock <= product.reorder_level) {
        toast.warning(`Low Stock Alert: ${product.name} has only ${newStock} ${product.unit} remaining.`);
      }

      return true;
    } catch (err) {
      toast.error('Failed to adjust stock');
      return false;
    }
  };

  // Computed values
  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, p) => sum + (p.selling_price * p.current_stock), 0);
  const lowStockProducts = products.filter(p => p.current_stock <= p.reorder_level && p.current_stock > 0);
  const stockoutProducts = products.filter(p => p.current_stock === 0);

  return {
    products,
    loading: businessLoading || loading,
    totalProducts,
    totalStockValue,
    lowStockProducts,
    stockoutProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    refetch: fetchProducts,
  };
}
