import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';

export interface StockMovement {
  id: string;
  product_id: string;
  business_id: string;
  movement_type: 'sale' | 'restock' | 'adjustment' | 'loss';
  quantity_change: number;
  previous_stock: number;
  new_stock: number;
  note: string | null;
  created_by: string;
  created_at: string;
}

export function useStockMovements(productId?: string) {
  const { business, loading: businessLoading } = useBusiness();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMovements = useCallback(async () => {
    if (businessLoading) return;
    if (!business?.id) { setMovements([]); setLoading(false); return; }

    try {
      setLoading(true);
      let query = supabase
        .from('stock_movements')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMovements((data || []) as StockMovement[]);
    } catch {
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, [business?.id, businessLoading, productId]);

  useEffect(() => { fetchMovements(); }, [fetchMovements]);

  return { movements, loading: businessLoading || loading, refetch: fetchMovements };
}
