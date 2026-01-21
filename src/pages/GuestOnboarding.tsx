import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, FileText, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BillingProfileForm, BillingFormData } from '@/components/guest/BillingProfileForm';
import { PlatformGuide } from '@/components/guest/PlatformGuide';
import { useAuth } from '@/hooks/useAuth';
import { useCreateBillingProfile, useBillingProfile } from '@/hooks/useBillingProfile';
import { useCurrentTeamMember } from '@/hooks/useCurrentTeamMember';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import centaurusLogo from '@/assets/centaurus-logo.jpeg';
type OnboardingStep = 'profile' | 'guide';
export default function GuestOnboarding() {
  const navigate = useNavigate();
  const {
    user,
    signOut
  } = useAuth();
  const {
    data: existingProfile,
    isLoading: isLoadingProfile
  } = useBillingProfile();
  const createProfile = useCreateBillingProfile();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('profile');
  // Use a ref to track profile completion - this prevents race condition with useEffect
  const hasCompletedProfileRef = useRef(false);
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', {
      replace: true
    });
  };
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle redirect logic for users who already have profiles
  useEffect(() => {
    if (isLoadingProfile) return;
    
    // If user just completed the profile form in this session, don't redirect
    if (hasCompletedProfileRef.current) return;
    
    // If user already has a profile (navigated here directly)
    if (existingProfile && currentStep === 'profile') {
      const hasSeenGuide = localStorage.getItem('guest-guide-completed') === 'true';
      if (hasSeenGuide) {
        navigate('/guest-dashboard', { replace: true });
      } else {
        // Show the guide step
        setCurrentStep('guide');
      }
    }
  }, [existingProfile, isLoadingProfile, currentStep, navigate]);

  if (isLoadingProfile) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  const handleProfileSubmit = async (data: BillingFormData) => {
    console.log('[GuestOnboarding] handleProfileSubmit called');
    setIsSubmitting(true);
    try {
      await createProfile.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        artisticName: data.artisticName,
        phoneNumber: data.phoneNumber,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        taxId: data.taxId,
        preferredCurrency: data.preferredCurrency,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        bankRoutingNumber: data.bankRoutingNumber,
        bankAccountHolder: data.bankAccountHolder,
        paypalEmail: data.paypalEmail,
        isBusiness: data.isBusiness,
        businessName: data.businessName,
        businessEmail: data.businessEmail,
        businessAddress: data.businessAddress,
        businessCity: data.businessCity,
        businessState: data.businessState,
        businessPostalCode: data.businessPostalCode,
        businessCountry: data.businessCountry,
        businessId: data.businessId,
        businessPhone: data.businessPhone
      });
      console.log('[GuestOnboarding] Profile created, setting step to guide');
      toast.success('Billing profile saved successfully!');
      // Mark that we completed the profile in this session to prevent redirect - using ref to avoid race condition
      hasCompletedProfileRef.current = true;
      setCurrentStep('guide');
      console.log('[GuestOnboarding] currentStep set to guide, hasCompletedProfileRef set to true');
    } catch (error: any) {
      console.error('[GuestOnboarding] Error creating profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { data: currentMember } = useCurrentTeamMember();

  const assignTutorialTask = async () => {
    if (!currentMember?.id) return;
    
    const TUTORIAL_TASK_ID = '00000000-0000-0000-0000-000000000004';
    
    try {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('task_people')
        .select('id')
        .eq('task_id', TUTORIAL_TASK_ID)
        .eq('team_member_id', currentMember.id)
        .maybeSingle();
      
      if (!existing) {
        // Assign user to the tutorial task
        await supabase
          .from('task_people')
          .insert({
            task_id: TUTORIAL_TASK_ID,
            team_member_id: currentMember.id
          });
        
        // Also add as task viewer so they can see it
        await supabase
          .from('task_viewers')
          .insert({
            task_id: TUTORIAL_TASK_ID,
            team_member_id: currentMember.id
          });
      }
    } catch (error) {
      console.error('Failed to assign tutorial task:', error);
    }
  };

  const handleGuideComplete = async () => {
    // Store that user has seen the guide
    localStorage.setItem('guest-guide-completed', 'true');
    
    // Assign tutorial task to the user
    await assignTutorialTask();
    
    toast.success('Welcome! A practice task has been added to help you learn the platform.');
    navigate('/guest-dashboard', {
      replace: true
    });
  };

  const handleSkipGuide = async () => {
    localStorage.setItem('guest-guide-completed', 'true');
    
    // Still assign tutorial task even if they skip
    await assignTutorialTask();
    
    navigate('/guest-dashboard', { replace: true });
  };
  const steps = [{
    id: 'profile',
    label: 'Billing Profile',
    icon: FileText
  }, {
    id: 'guide',
    label: 'Platform Guide',
    icon: CheckCircle2
  }];
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = (currentStepIndex + 1) / steps.length * 100;
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={centaurusLogo} alt="Centaurus" className="h-10 w-10 rounded-lg object-cover" />
              <div>
                <h1 className="text-xl font-semibold">Welcome to Centaurus</h1>
                <p className="text-sm text-muted-foreground">Let's set up your profile</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="bg-[#e00000] text-white">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = index < currentStepIndex;
            const Icon = step.icon;
            return <div key={step.id} className={cn("flex items-center gap-2", index < steps.length - 1 && "flex-1")}>
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all", isActive && "border-primary bg-primary text-primary-foreground", isCompleted && "border-primary bg-primary/20 text-primary", !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={cn("text-sm font-medium hidden sm:inline", isActive && "text-primary", !isActive && "text-muted-foreground")}>
                    {step.label}
                  </span>
                  {index < steps.length - 1 && <div className={cn("flex-1 h-0.5 mx-4", isCompleted ? "bg-primary" : "bg-muted")} />}
                </div>;
          })}
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        {/* Step Content */}
        <div className="bg-card rounded-xl border shadow-sm p-6 md:p-8">
          {currentStep === 'profile' && <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Complete Your Billing Profile</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  This information will be used for all your invoices. You can edit it until you submit your first invoice.
                </p>
              </div>
              <BillingProfileForm defaultValues={{
            email: user?.email || ''
          }} onSubmit={handleProfileSubmit} isLoading={isSubmitting} submitLabel="Save & Continue" />
            </div>}

          {currentStep === 'guide' && <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Learn How to Use the Portal</h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  A quick guide to help you navigate tasks, completions, and invoicing.
                </p>
              </div>
              <PlatformGuide onComplete={handleGuideComplete} onSkip={handleSkipGuide} />
            </div>}
        </div>
      </div>
    </div>;
}