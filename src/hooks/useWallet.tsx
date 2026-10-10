import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Wallet {
  id: string;
  business_id: string;
  user_id: string;
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UseWalletReturn {
  wallet: Wallet | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createWallet: () => Promise<Wallet | null>;
}

export function useWallet(): UseWalletReturn {
  const { business } = useBusiness();
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWallet = useCallback(async () => {
    if (!business?.id || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('wallets')
        .select('*')
        .eq('business_id', business.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setWallet(data as Wallet);
      } else {
        // Auto-create wallet if it doesn't exist
        const newWallet = await createWallet();
        if (newWallet) {
          setWallet(newWallet);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [business?.id, user?.id]);

  const createWallet = async (): Promise<Wallet | null> => {
    if (!business?.id || !user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('wallets')
        .insert({
          business_id: business.id,
          user_id: user.id,
          balance: 0,
          currency: 'KES',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Wallet;
    } catch (err: any) {
      // Wallet might already exist, try fetching again
      const { data } = await (supabase as any)
        .from('wallets')
        .select('*')
        .eq('business_id', business.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      return data as Wallet | null;
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  // Live balance: apply wallet row updates as soon as a payment is credited.
  useEffect(() => {
    if (!business?.id || !user?.id) return;
    const ch = supabase
      .channel(`wallet-${business.id}-${user.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `business_id=eq.${business.id}` }, (payload) => {
        const row = payload.new as Wallet;
        if (row.user_id === user.id) setWallet(row);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [business?.id, user?.id]);

  return {
    wallet,
    loading,
    error,
    refetch: fetchWallet,
    createWallet,
  };
}
