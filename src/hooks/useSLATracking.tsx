import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBusiness } from '@/hooks/useBusiness';

export interface SLATrackingRecord {
  id: string;
  conversation_id: string;
  sla_policy_id: string | null;
  first_customer_message_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  first_response_time: number | null;
  resolution_time: number | null;
  first_response_breached: boolean;
  resolution_breached: boolean;
  first_response_warning_sent: boolean;
  resolution_warning_sent: boolean;
  paused_at: string | null;
  total_paused_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface SLABreachLog {
  id: string;
  business_id: string;
  conversation_id: string;
  breach_type: 'first_response' | 'resolution';
  target_minutes: number;
  actual_minutes: number;
  assigned_to: string | null;
  channel_type: string;
  priority: string;
  created_at: string;
}

export interface SLAMetrics {
  total_conversations: number;
  avg_first_response_minutes: number | null;
  avg_resolution_minutes: number | null;
  first_response_breach_count: number;
  resolution_breach_count: number;
  first_response_compliance_rate: number | null;
  resolution_compliance_rate: number | null;
}

export type SLAStatus = 'on_track' | 'warning' | 'breached' | 'resolved' | 'paused';

export interface SLAStatusInfo {
  status: SLAStatus;
  firstResponseStatus: SLAStatus;
  resolutionStatus: SLAStatus;
  timeRemaining: number | null; // in minutes, null if N/A
  elapsed: number; // in minutes
  firstResponseTime: number | null;
  resolutionTime: number | null;
}

interface UseSLATrackingReturn {
  getSLAStatus: (conversationId: string) => Promise<SLAStatusInfo | null>;
  getSLATracking: (conversationId: string) => Promise<SLATrackingRecord | null>;
  getBreachLogs: (filters?: { 
    startDate?: Date; 
    endDate?: Date; 
    breachType?: 'first_response' | 'resolution';
    limit?: number;
  }) => Promise<SLABreachLog[]>;
  getSLAMetrics: (startDate?: Date, endDate?: Date) => Promise<SLAMetrics | null>;
  trackingRecords: Map<string, SLATrackingRecord>;
  subscribeToTracking: (conversationId: string) => () => void;
}

export function useSLATracking(): UseSLATrackingReturn {
  const { business } = useBusiness();
  const [trackingRecords, setTrackingRecords] = useState<Map<string, SLATrackingRecord>>(new Map());

  const getSLATracking = useCallback(async (conversationId: string): Promise<SLATrackingRecord | null> => {
    try {
      const { data, error } = await supabase
        .from('sla_tracking')
        .select('*')
        .eq('conversation_id', conversationId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No record found
        throw error;
      }

      return data as SLATrackingRecord;
    } catch (err) {
      console.error('Error fetching SLA tracking:', err);
      return null;
    }
  }, []);

  const getSLAStatus = useCallback(async (conversationId: string): Promise<SLAStatusInfo | null> => {
    const tracking = await getSLATracking(conversationId);
    
    if (!tracking || !tracking.first_customer_message_at) {
      return null;
    }

    // Get the associated policy targets (use defaults if no policy)
    let firstResponseTarget = 60; // default 1 hour
    let resolutionTarget = 1440; // default 24 hours
    let warningThreshold = 80;

    if (tracking.sla_policy_id) {
      const { data: policy } = await supabase
        .from('sla_policies')
        .select('first_response_target, resolution_target, warning_threshold')
        .eq('id', tracking.sla_policy_id)
        .single();

      if (policy) {
        firstResponseTarget = policy.first_response_target;
        resolutionTarget = policy.resolution_target;
        warningThreshold = policy.warning_threshold;
      }
    }

    const now = new Date();
    const startTime = new Date(tracking.first_customer_message_at);
    const pausedMinutes = tracking.total_paused_minutes || 0;
    
    let elapsedMinutes: number;
    if (tracking.paused_at) {
      const pausedAt = new Date(tracking.paused_at);
      elapsedMinutes = Math.floor((pausedAt.getTime() - startTime.getTime()) / 60000) - pausedMinutes;
    } else {
      elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000) - pausedMinutes;
    }

    // Determine first response status
    let firstResponseStatus: SLAStatus;
    if (tracking.first_response_at) {
      firstResponseStatus = tracking.first_response_breached ? 'breached' : 'resolved';
    } else if (tracking.first_response_breached) {
      firstResponseStatus = 'breached';
    } else if (tracking.paused_at) {
      firstResponseStatus = 'paused';
    } else if (elapsedMinutes >= firstResponseTarget * warningThreshold / 100) {
      firstResponseStatus = 'warning';
    } else {
      firstResponseStatus = 'on_track';
    }

    // Determine resolution status
    let resolutionStatus: SLAStatus;
    if (tracking.resolved_at) {
      resolutionStatus = tracking.resolution_breached ? 'breached' : 'resolved';
    } else if (tracking.resolution_breached) {
      resolutionStatus = 'breached';
    } else if (tracking.paused_at) {
      resolutionStatus = 'paused';
    } else if (elapsedMinutes >= resolutionTarget * warningThreshold / 100) {
      resolutionStatus = 'warning';
    } else {
      resolutionStatus = 'on_track';
    }

    // Overall status (worst of the two)
    let status: SLAStatus;
    if (tracking.resolved_at) {
      status = (tracking.first_response_breached || tracking.resolution_breached) ? 'breached' : 'resolved';
    } else if (firstResponseStatus === 'breached' || resolutionStatus === 'breached') {
      status = 'breached';
    } else if (tracking.paused_at) {
      status = 'paused';
    } else if (firstResponseStatus === 'warning' || resolutionStatus === 'warning') {
      status = 'warning';
    } else {
      status = 'on_track';
    }

    // Calculate time remaining for the most urgent unmet SLA
    let timeRemaining: number | null = null;
    if (!tracking.resolved_at && !tracking.paused_at) {
      if (!tracking.first_response_at && !tracking.first_response_breached) {
        timeRemaining = firstResponseTarget - elapsedMinutes;
      } else if (!tracking.resolution_breached) {
        timeRemaining = resolutionTarget - elapsedMinutes;
      }
    }

    return {
      status,
      firstResponseStatus,
      resolutionStatus,
      timeRemaining,
      elapsed: elapsedMinutes,
      firstResponseTime: tracking.first_response_time,
      resolutionTime: tracking.resolution_time,
    };
  }, [getSLATracking]);

  const getBreachLogs = useCallback(async (filters?: {
    startDate?: Date;
    endDate?: Date;
    breachType?: 'first_response' | 'resolution';
    limit?: number;
  }): Promise<SLABreachLog[]> => {
    if (!business?.id) return [];

    try {
      let query = supabase
        .from('sla_breach_logs')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }
      if (filters?.breachType) {
        query = query.eq('breach_type', filters.breachType);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as SLABreachLog[];
    } catch (err) {
      console.error('Error fetching breach logs:', err);
      return [];
    }
  }, [business?.id]);

  const getSLAMetrics = useCallback(async (
    startDate?: Date, 
    endDate?: Date
  ): Promise<SLAMetrics | null> => {
    if (!business?.id) return null;

    try {
      const { data, error } = await supabase.rpc('get_sla_metrics', {
        p_business_id: business.id,
        p_start_date: startDate?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        p_end_date: endDate?.toISOString() || new Date().toISOString(),
      });

      if (error) throw error;

      if (data && data.length > 0) {
        return data[0] as SLAMetrics;
      }
      return null;
    } catch (err) {
      console.error('Error fetching SLA metrics:', err);
      return null;
    }
  }, [business?.id]);

  const subscribeToTracking = useCallback((conversationId: string): (() => void) => {
    const channel = supabase
      .channel(`sla_tracking_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sla_tracking',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setTrackingRecords(prev => {
              const next = new Map(prev);
              next.delete(conversationId);
              return next;
            });
          } else {
            const record = payload.new as SLATrackingRecord;
            setTrackingRecords(prev => new Map(prev).set(conversationId, record));
          }
        }
      )
      .subscribe();

    // Fetch initial data
    getSLATracking(conversationId).then(record => {
      if (record) {
        setTrackingRecords(prev => new Map(prev).set(conversationId, record));
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [getSLATracking]);

  return {
    getSLAStatus,
    getSLATracking,
    getBreachLogs,
    getSLAMetrics,
    trackingRecords,
    subscribeToTracking,
  };
}
