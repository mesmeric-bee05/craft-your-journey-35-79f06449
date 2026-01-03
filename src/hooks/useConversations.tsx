import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  channel_type: string;
  tags: string[];
  notes: string | null;
}

export interface Conversation {
  id: string;
  business_id: string;
  customer_id: string;
  channel_type: string;
  status: 'open' | 'pending' | 'resolved' | 'archived';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to: string | null;
  subject: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  tags: string[];
  customer?: Customer;
  created_at: string;
  updated_at: string;
}

interface UseConversationsReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  selectedConversation: Conversation | null;
  selectConversation: (conversation: Conversation | null) => void;
  refetch: () => Promise<void>;
  updateConversationStatus: (id: string, status: Conversation['status']) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  filterByStatus: (status: Conversation['status'] | 'all') => void;
  filterByChannel: (channel: string | 'all') => void;
  activeFilters: { status: string; channel: string };
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searching: boolean;
}

export function useConversations(): UseConversationsReturn {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeFilters, setActiveFilters] = useState({ status: 'all', channel: 'all' });
  const [searchQuery, setSearchQueryState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query
  useEffect(() => {
    setSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const setSearchQuery = (query: string) => {
    setSearchQueryState(query);
  };

  const fetchConversations = useCallback(async () => {
    if (!business?.id) {
      setLoading(false);
      setSearching(false);
      return;
    }

    try {
      if (!debouncedSearch) {
        setLoading(true);
      }
      setError(null);

      let query = supabase
        .from('conversations')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('business_id', business.id);

      // Apply server-side search filter
      if (debouncedSearch) {
        query = query.or(`last_message_preview.ilike.%${debouncedSearch}%,subject.ilike.%${debouncedSearch}%`);
      }

      const { data, error: fetchError } = await query.order('last_message_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Additional client-side filter for customer name/email if search is active
      let results = data as unknown as Conversation[];
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        results = results.filter(c => 
          c.last_message_preview?.toLowerCase().includes(searchLower) ||
          c.subject?.toLowerCase().includes(searchLower) ||
          c.customer?.name?.toLowerCase().includes(searchLower) ||
          c.customer?.email?.toLowerCase().includes(searchLower)
        );
      }

      setConversations(results);
      setFilteredConversations(results);
    } catch (err: any) {
      setError(err.message);
      toast({ title: 'Error loading conversations', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [business?.id, debouncedSearch, toast]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Real-time subscription for conversation updates
  useEffect(() => {
    if (!business?.id) return;

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `business_id=eq.${business.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business?.id, fetchConversations]);

  const applyFilters = useCallback(() => {
    let filtered = [...conversations];

    if (activeFilters.status !== 'all') {
      filtered = filtered.filter((c) => c.status === activeFilters.status);
    }

    if (activeFilters.channel !== 'all') {
      filtered = filtered.filter((c) => c.channel_type === activeFilters.channel);
    }

    setFilteredConversations(filtered);
  }, [conversations, activeFilters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const filterByStatus = (status: Conversation['status'] | 'all') => {
    setActiveFilters((prev) => ({ ...prev, status }));
  };

  const filterByChannel = (channel: string | 'all') => {
    setActiveFilters((prev) => ({ ...prev, channel }));
  };

  const updateConversationStatus = async (id: string, status: Conversation['status']) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status } : c))
      );

      toast({ title: `Conversation marked as ${status}` });
    } catch (err: any) {
      toast({ title: 'Error updating conversation', description: err.message, variant: 'destructive' });
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', id);

      if (error) throw error;

      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
      );
    } catch (err: any) {
      console.error('Error marking as read:', err);
    }
  };

  return {
    conversations: filteredConversations,
    loading,
    error,
    selectedConversation,
    selectConversation: setSelectedConversation,
    refetch: fetchConversations,
    updateConversationStatus,
    markAsRead,
    filterByStatus,
    filterByChannel,
    activeFilters,
    searchQuery,
    setSearchQuery,
    searching,
  };
}
