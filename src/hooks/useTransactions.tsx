import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';

export interface Transaction {
  id: string;
  business_id: string;
  wallet_id: string | null;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund' | 'payout';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  recipient_type: string | null;
  recipient_id: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  external_reference: string | null;
  payment_method: 'mpesa' | 'bank' | 'card' | 'wallet';
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CreateTransactionInput {
  type: Transaction['type'];
  amount: number;
  recipient_phone?: string;
  recipient_name?: string;
  description?: string;
  payment_method: Transaction['payment_method'];
  recipient_type?: string;
  recipient_id?: string;
}

interface UseTransactionsReturn {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  loading: boolean;
  error: string | null;
  createTransaction: (input: CreateTransactionInput) => Promise<Transaction | null>;
  refetch: () => Promise<void>;
  filterByType: (type: string) => void;
  filterByStatus: (status: string) => void;
  activeFilters: { type: string; status: string };
}

export function useTransactions(): UseTransactionsReturn {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState({ type: 'all', status: 'all' });

  const fetchTransactions = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('transactions')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const typedData = (data || []) as Transaction[];
      setTransactions(typedData);
      setFilteredTransactions(typedData);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: 'Error loading transactions',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [business?.id, toast]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Live updates when a payment confirmation changes a transaction (RLS still applies).
  useEffect(() => {
    if (!business?.id) return;
    const ch = supabase
      .channel(`tx-${business.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `business_id=eq.${business.id}` }, () => { fetchTransactions(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [business?.id, fetchTransactions]);

  useEffect(() => {
    let filtered = [...transactions];
    if (activeFilters.type !== 'all') {
      filtered = filtered.filter((t) => t.type === activeFilters.type);
    }
    if (activeFilters.status !== 'all') {
      filtered = filtered.filter((t) => t.status === activeFilters.status);
    }
    setFilteredTransactions(filtered);
  }, [transactions, activeFilters]);

  const filterByType = (type: string) => {
    setActiveFilters((prev) => ({ ...prev, type }));
  };

  const filterByStatus = (status: string) => {
    setActiveFilters((prev) => ({ ...prev, status }));
  };

  const createTransaction = async (input: CreateTransactionInput): Promise<Transaction | null> => {
    if (!business?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('transactions')
        .insert({
          business_id: business.id,
          type: input.type,
          amount: input.amount,
          currency: 'KES',
          status: 'pending',
          recipient_phone: input.recipient_phone,
          recipient_name: input.recipient_name,
          recipient_type: input.recipient_type || 'external',
          recipient_id: input.recipient_id,
          payment_method: input.payment_method,
          description: input.description,
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction = data as Transaction;
      setTransactions((prev) => [newTransaction, ...prev]);

      toast({
        title: 'Transaction created',
        description: `${input.type} of KES ${input.amount.toLocaleString()} is being processed`,
      });

      return newTransaction;
    } catch (err: any) {
      toast({
        title: 'Transaction failed',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    transactions: filteredTransactions,
    filteredTransactions,
    loading,
    error,
    createTransaction,
    refetch: fetchTransactions,
    filterByType,
    filterByStatus,
    activeFilters,
  };
}
