import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from './useBusiness';
import { useToast } from './use-toast';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export type CalendarEvent = {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  event_type: 'post' | 'campaign' | 'reminder' | 'holiday' | 'custom';
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  color: string;
  linked_campaign_id: string | null;
  linked_post_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export function useCalendarEvents(selectedDate?: Date) {
  const { business } = useBusiness();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const monthStart = selectedDate ? startOfMonth(selectedDate) : startOfMonth(new Date());
  const monthEnd = selectedDate ? endOfMonth(selectedDate) : endOfMonth(new Date());

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['calendar-events', business?.id, format(monthStart, 'yyyy-MM')],
    queryFn: async () => {
      if (!business?.id) return [];
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('business_id', business.id)
        .gte('start_date', monthStart.toISOString())
        .lte('start_date', monthEnd.toISOString())
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as CalendarEvent[];
    },
    enabled: !!business?.id,
  });

  const createEvent = useMutation({
    mutationFn: async (event: Omit<Partial<CalendarEvent>, 'id' | 'metadata'>) => {
      if (!business?.id) throw new Error('No business selected');
      
      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          business_id: business.id,
          title: event.title || 'New Event',
          start_date: event.start_date || new Date().toISOString(),
          ...event,
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({ title: 'Event created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create event', description: error.message, variant: 'destructive' });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, metadata, ...updates }: Partial<CalendarEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({ title: 'Event updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update event', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({ title: 'Event deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete event', description: error.message, variant: 'destructive' });
    },
  });

  return {
    events,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
