import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface UserSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  notification_sound: boolean;
  notify_new_message: boolean;
  notify_new_order: boolean;
  notify_campaign_updates: boolean;
  notify_team_activity: boolean;
  notify_weekly_digest: boolean;
  theme: string;
  compact_mode: boolean;
  preferences: Record<string, any>;
}

const defaultSettings: Omit<UserSettings, 'id' | 'user_id'> = {
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
  notification_sound: true,
  notify_new_message: true,
  notify_new_order: true,
  notify_campaign_updates: true,
  notify_team_activity: false,
  notify_weekly_digest: true,
  theme: 'system',
  compact_mode: false,
};

export function useUserSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings found, create default
        const { data: newData, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, ...defaultSettings })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newData as unknown as UserSettings);
      } else if (error) {
        throw error;
      } else {
        setSettings(data as unknown as UserSettings);
      }
    } catch (err: any) {
      logger.error('Error fetching user settings', err, { hook: 'useUserSettings' });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user?.id || !settings) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast({ title: 'Settings saved' });
    } catch (err: any) {
      toast({ title: 'Error saving settings', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  return { settings, loading, updateSettings, refetch: fetchSettings };
}
