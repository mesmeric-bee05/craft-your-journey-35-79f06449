import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { BusinessDetailsStep } from '@/components/onboarding/BusinessDetailsStep';
import { BrandingStep } from '@/components/onboarding/BrandingStep';
import { TeamInviteStep } from '@/components/onboarding/TeamInviteStep';
import { Rocket } from 'lucide-react';

const steps = [
  { title: 'Business Details', description: 'Basic information' },
  { title: 'Branding', description: 'Logo & colors' },
  { title: 'Team', description: 'Invite members' },
];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    currentStep,
    businessDetails,
    brandingDetails,
    teamMembers,
    isLoading,
    updateBusinessDetails,
    updateBrandingDetails,
    addTeamMember,
    removeTeamMember,
    saveBusinessDetails,
    saveBrandingDetails,
    sendTeamInvitations,
    prevStep,
    uploadAsset,
  } = useOnboarding();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Set Up Your Business
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete these steps to get your SmartReach AI account ready
          </p>
        </div>

        {/* Progress */}
        <OnboardingProgress currentStep={currentStep} steps={steps} />

        {/* Step Content */}
        <div className="mt-8">
          {currentStep === 0 && (
            <BusinessDetailsStep
              details={businessDetails}
              onUpdate={updateBusinessDetails}
              onNext={saveBusinessDetails}
              isLoading={isLoading}
            />
          )}

          {currentStep === 1 && (
            <BrandingStep
              details={brandingDetails}
              onUpdate={updateBrandingDetails}
              onUpload={uploadAsset}
              onNext={saveBrandingDetails}
              onBack={prevStep}
              isLoading={isLoading}
            />
          )}

          {currentStep === 2 && (
            <TeamInviteStep
              members={teamMembers}
              onAdd={addTeamMember}
              onRemove={removeTeamMember}
              onComplete={sendTeamInvitations}
              onBack={prevStep}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
