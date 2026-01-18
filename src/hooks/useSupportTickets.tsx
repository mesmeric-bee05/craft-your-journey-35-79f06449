import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface SupportTicket {
  id: string;
  business_id: string;
  user_id: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'general';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  assigned_to: string | null;
  attachments: any[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface CreateTicketInput {
  subject: string;
  description: string;
  category: string;
  priority: string;
  attachments?: any[];
}

interface UseSupportTicketsReturn {
  tickets: SupportTicket[];
  loading: boolean;
  error: string | null;
  createTicket: (input: CreateTicketInput) => Promise<SupportTicket | null>;
  updateTicket: (id: string, updates: Partial<SupportTicket>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSupportTickets(): UseSupportTicketsReturn {
  const { business } = useBusiness();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await (supabase as any)
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setTickets((data || []) as SupportTicket[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = async (input: CreateTicketInput): Promise<SupportTicket | null> => {
    if (!business?.id || !user?.id) return null;

    try {
      const { data, error } = await (supabase as any)
        .from('support_tickets')
        .insert({
          business_id: business.id,
          user_id: user.id,
          subject: input.subject,
          description: input.description,
          category: input.category,
          priority: input.priority,
          attachments: input.attachments || [],
        })
        .select()
        .single();

      if (error) throw error;

      const newTicket = data as SupportTicket;
      setTickets((prev) => [newTicket, ...prev]);

      toast({
        title: 'Support ticket created',
        description: 'We will respond within 24 hours.',
      });

      return newTicket;
    } catch (err: any) {
      toast({
        title: 'Error creating ticket',
        description: err.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateTicket = async (id: string, updates: Partial<SupportTicket>) => {
    try {
      const { error } = await (supabase as any)
        .from('support_tickets')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
    } catch (err: any) {
      toast({
        title: 'Error updating ticket',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  return {
    tickets,
    loading,
    error,
    createTicket,
    updateTicket,
    refetch: fetchTickets,
  };
}
