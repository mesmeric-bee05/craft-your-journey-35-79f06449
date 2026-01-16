import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Factor } from '@supabase/supabase-js';

type AssuranceLevel = 'aal1' | 'aal2' | null;

interface MFAState {
  factors: Factor[];
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
  isEnrolled: boolean;
  isVerified: boolean;
  loading: boolean;
}

export function useMFA() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<MFAState>({
    factors: [],
    currentLevel: null,
    nextLevel: null,
    isEnrolled: false,
    isVerified: false,
    loading: true,
  });

  const fetchMFAStatus = useCallback(async () => {
    if (!user) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      // Get enrolled factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) throw factorsError;

      // Get assurance level
      const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aalError) throw aalError;

      const verifiedFactors = factorsData?.totp?.filter(f => f.status === 'verified') || [];
      
      setState({
        factors: factorsData?.totp || [],
        currentLevel: aalData?.currentLevel || null,
        nextLevel: aalData?.nextLevel || null,
        isEnrolled: verifiedFactors.length > 0,
        isVerified: aalData?.currentLevel === aalData?.nextLevel,
        loading: false,
      });
    } catch (error: any) {
      console.error('Error fetching MFA status:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    fetchMFAStatus();
  }, [fetchMFAStatus]);

  const enrollMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (error) throw error;

      return {
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      };
    } catch (error: any) {
      toast({
        title: 'Failed to start MFA enrollment',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const verifyEnrollment = async (factorId: string, code: string) => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });

      if (challengeError) throw challengeError;

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      // Update MFA settings in database
      await supabase.from('user_mfa_settings').upsert({
        user_id: user?.id,
        is_mfa_enabled: true,
        last_verified_at: new Date().toISOString(),
      });

      await fetchMFAStatus();

      toast({
        title: 'Two-factor authentication enabled',
        description: 'Your account is now more secure.',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const verifyMFA = async (code: string) => {
    try {
      const verifiedFactor = state.factors.find(f => f.status === 'verified');
      
      if (!verifiedFactor) {
        throw new Error('No verified MFA factor found');
      }

      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (challengeError) throw challengeError;

      const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: verifiedFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      // Update last verified timestamp
      await supabase.from('user_mfa_settings').update({
        last_verified_at: new Date().toISOString(),
      }).eq('user_id', user?.id);

      await fetchMFAStatus();

      return true;
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const unenrollMFA = async () => {
    try {
      const verifiedFactor = state.factors.find(f => f.status === 'verified');
      
      if (!verifiedFactor) {
        throw new Error('No verified MFA factor found');
      }

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: verifiedFactor.id,
      });

      if (error) throw error;

      // Update database
      await supabase.from('user_mfa_settings').update({
        is_mfa_enabled: false,
      }).eq('user_id', user?.id);

      await fetchMFAStatus();

      toast({
        title: 'Two-factor authentication disabled',
        description: 'You can re-enable it anytime.',
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Failed to disable MFA',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    ...state,
    enrollMFA,
    verifyEnrollment,
    verifyMFA,
    unenrollMFA,
    refreshStatus: fetchMFAStatus,
  };
}
