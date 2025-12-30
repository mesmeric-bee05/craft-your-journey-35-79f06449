import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface BusinessDetails {
  name: string;
  description: string;
  industry: string;
  businessType: 'retail' | 'restaurant' | 'service' | 'ecommerce' | 'other';
  website: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
}

export interface BrandingDetails {
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

export interface TeamMember {
  email: string;
  role: 'admin' | 'manager' | 'member';
}

interface OnboardingState {
  currentStep: number;
  businessId: string | null;
  businessDetails: BusinessDetails;
  brandingDetails: BrandingDetails;
  teamMembers: TeamMember[];
  isLoading: boolean;
}

const initialBusinessDetails: BusinessDetails = {
  name: '',
  description: '',
  industry: '',
  businessType: 'other',
  website: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  country: 'Kenya',
};

const initialBrandingDetails: BrandingDetails = {
  logoUrl: null,
  coverImageUrl: null,
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
};

export function useOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    businessId: null,
    businessDetails: initialBusinessDetails,
    brandingDetails: initialBrandingDetails,
    teamMembers: [],
    isLoading: false,
  });

  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  const updateBusinessDetails = useCallback((details: Partial<BusinessDetails>) => {
    setState(prev => ({
      ...prev,
      businessDetails: { ...prev.businessDetails, ...details },
    }));
  }, []);

  const updateBrandingDetails = useCallback((details: Partial<BrandingDetails>) => {
    setState(prev => ({
      ...prev,
      brandingDetails: { ...prev.brandingDetails, ...details },
    }));
  }, []);

  const addTeamMember = useCallback((member: TeamMember) => {
    setState(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, member],
    }));
  }, []);

  const removeTeamMember = useCallback((email: string) => {
    setState(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter(m => m.email !== email),
    }));
  }, []);

  const saveBusinessDetails = useCallback(async () => {
    if (!user) return null;

    setLoading(true);
    try {
      const businessData: Record<string, any> = {
        owner_id: user.id,
        name: state.businessDetails.name,
        description: state.businessDetails.description,
        industry: state.businessDetails.industry,
        business_type: state.businessDetails.businessType as any,
        website: state.businessDetails.website,
        email: state.businessDetails.email,
        phone: state.businessDetails.phone,
        address: state.businessDetails.address,
        city: state.businessDetails.city,
        country: state.businessDetails.country,
        onboarding_step: 1,
      };

      const { data, error } = await supabase
        .from('businesses')
        .insert([businessData] as any)
        .select()
        .single();

      if (error) throw error;

      setState(prev => ({ ...prev, businessId: data.id, currentStep: 1 }));
      toast({ title: 'Business created successfully!' });
      return data.id;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, state.businessDetails, setLoading, toast]);

  const saveBrandingDetails = useCallback(async () => {
    if (!state.businessId) return false;

    setLoading(true);
    try {
      const updateData: Record<string, any> = {
        logo_url: state.brandingDetails.logoUrl,
        cover_image_url: state.brandingDetails.coverImageUrl,
        settings: {
          primaryColor: state.brandingDetails.primaryColor,
          secondaryColor: state.brandingDetails.secondaryColor,
        },
        onboarding_step: 2,
      };

      const { error } = await supabase
        .from('businesses')
        .update(updateData)
        .eq('id', state.businessId);

      if (error) throw error;

      setState(prev => ({ ...prev, currentStep: 2 }));
      toast({ title: 'Branding saved successfully!' });
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [state.businessId, state.brandingDetails, setLoading, toast]);

  const sendTeamInvitations = useCallback(async () => {
    if (!state.businessId || !user) return false;

    setLoading(true);
    try {
      const invitations = state.teamMembers.map(member => ({
        business_id: state.businessId as string,
        email: member.email,
        role: member.role,
        invited_by: user.id,
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      if (invitations.length > 0) {
        const { error } = await supabase
          .from('team_invitations' as any)
          .insert(invitations as any);

        if (error) throw error;
      }

      // Complete onboarding
      const completeData: Record<string, any> = {
        onboarding_step: 3,
        onboarding_completed: true,
      };

      await supabase
        .from('businesses')
        .update(completeData)
        .eq('id', state.businessId);

      toast({ title: 'Team invitations sent!' });
      navigate('/dashboard');
      return true;
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [state.businessId, state.teamMembers, user, setLoading, toast, navigate]);

  const goToStep = useCallback((step: number) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const uploadAsset = useCallback(async (file: File, type: 'logo' | 'cover') => {
    if (!user) return null;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(fileName);

      if (type === 'logo') {
        updateBrandingDetails({ logoUrl: publicUrl });
      } else {
        updateBrandingDetails({ coverImageUrl: publicUrl });
      }

      return publicUrl;
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, setLoading, toast, updateBrandingDetails]);

  return {
    ...state,
    updateBusinessDetails,
    updateBrandingDetails,
    addTeamMember,
    removeTeamMember,
    saveBusinessDetails,
    saveBrandingDetails,
    sendTeamInvitations,
    goToStep,
    nextStep,
    prevStep,
    uploadAsset,
  };
}
