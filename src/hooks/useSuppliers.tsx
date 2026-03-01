import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { toast } from 'sonner';

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  product_categories: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSuppliers() {
  const { business, loading: businessLoading } = useBusiness();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = useCallback(async () => {
    if (businessLoading) return;
    if (!business?.id) { setSuppliers([]); setLoading(false); return; }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', business.id)
        .order('name');

      if (error) throw error;
      setSuppliers((data || []) as Supplier[]);
    } catch (err) {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [business?.id, businessLoading]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const createSupplier = async (supplier: Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>) => {
    if (!business?.id) return null;
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...supplier, business_id: business.id })
        .select()
        .single();
      if (error) throw error;
      const newSupplier = data as Supplier;
      setSuppliers(prev => [...prev, newSupplier].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Supplier added');
      return newSupplier;
    } catch (err) {
      toast.error('Failed to add supplier');
      return null;
    }
  };

  const updateSupplier = async (id: string, updates: Partial<Omit<Supplier, 'id' | 'business_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { error } = await supabase.from('suppliers').update(updates).eq('id', id);
      if (error) throw error;
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      toast.success('Supplier updated');
      return true;
    } catch (err) {
      toast.error('Failed to update supplier');
      return false;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      setSuppliers(prev => prev.filter(s => s.id !== id));
      toast.success('Supplier deleted');
      return true;
    } catch (err) {
      toast.error('Failed to delete supplier');
      return false;
    }
  };

  return { suppliers, loading: businessLoading || loading, createSupplier, updateSupplier, deleteSupplier, refetch: fetchSuppliers };
}
