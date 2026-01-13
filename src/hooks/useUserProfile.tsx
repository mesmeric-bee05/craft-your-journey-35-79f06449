import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  language: string;
  timezone: string;
}

export function useUserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data as UserProfile);
    } catch (err: any) {
      logger.error('Error fetching user profile', err, { hook: 'useUserProfile' });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) return;

    try {
      // Use upsert to handle cases where profile might not exist
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          user_id: user.id, 
          ...updates, 
          updated_at: new Date().toISOString() 
        }, { 
          onConflict: 'user_id' 
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data as UserProfile);
      toast({ title: 'Profile updated successfully' });
    } catch (err: any) {
      toast({ title: 'Error updating profile', description: err.message, variant: 'destructive' });
      throw err;
    }
  };

  return { profile, loading, updateProfile, refetch: fetchProfile };
}
