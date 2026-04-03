import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';
import { sanitizeSearchInput } from '@/lib/sanitize';

type ChannelType = 'email' | 'facebook' | 'instagram' | 'sms' | 'telegram' | 'tiktok' | 'twitter' | 'whatsapp';

export interface Customer {
  id: string;
  business_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  channel_type: ChannelType;
  tags: string[];
  notes: string | null;
  external_id: string | null;
  first_contact_at: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
  conversation_count?: number;
}

interface UseCustomersReturn {
  customers: Customer[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  channelFilter: string;
  setChannelFilter: (c: string) => void;
  tagFilter: string;
  setTagFilter: (t: string) => void;
  createCustomer: (data: Partial<Customer>) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  allTags: string[];
  totalCount: number;
}

export function useCustomers(): UseCustomersReturn {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  const fetchCustomers = useCallback(async () => {
    if (!business?.id) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('customers')
        .select('*')
        .eq('business_id', business.id)
        .order('last_contact_at', { ascending: false, nullsFirst: false });

      if (channelFilter !== 'all') {
        query = query.eq('channel_type', channelFilter as ChannelType);
      }

      if (searchQuery.trim()) {
        const sanitized = sanitizeSearchInput(searchQuery);
        query = query.or(`name.ilike.%${sanitized}%,email.ilike.%${sanitized}%,phone.ilike.%${sanitized}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = (data || []) as Customer[];

      if (tagFilter !== 'all') {
        result = result.filter(c => c.tags?.includes(tagFilter));
      }

      setCustomers(result);
    } catch (err: any) {
      toast({ title: 'Error loading customers', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [business?.id, searchQuery, channelFilter, tagFilter, toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const createCustomer = async (data: Partial<Customer>) => {
    if (!business?.id) return;
    const { error } = await supabase.from('customers').insert([{
      business_id: business.id,
      name: data.name || null,
      email: data.email || null,
      phone: data.phone || null,
      channel_type: (data.channel_type || 'whatsapp') as ChannelType,
      tags: data.tags || [],
      notes: data.notes || null,
    }]);
    if (error) {
      toast({ title: 'Error creating customer', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Customer created' });
    fetchCustomers();
  };

  const updateCustomer = async (id: string, data: Partial<Customer>) => {
    if (!business?.id) return;
    const updateData: Record<string, unknown> = { ...data };
    const { error } = await supabase.from('customers').update(updateData as any).eq('id', id).eq('business_id', business.id);
    if (error) {
      toast({ title: 'Error updating customer', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Customer updated' });
    fetchCustomers();
  };

  const deleteCustomer = async (id: string) => {
    if (!business?.id) return;
    const { error } = await supabase.from('customers').delete().eq('id', id).eq('business_id', business.id);
    if (error) {
      toast({ title: 'Error deleting customer', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Customer deleted' });
    fetchCustomers();
  };

  const allTags = Array.from(new Set(customers.flatMap(c => c.tags || [])));

  return {
    customers,
    loading,
    searchQuery,
    setSearchQuery,
    channelFilter,
    setChannelFilter,
    tagFilter,
    setTagFilter,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refetch: fetchCustomers,
    allTags,
    totalCount: customers.length,
  };
}
