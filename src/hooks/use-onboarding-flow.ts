import { useToast } from '@/hooks/use-toast';
import type { ConfirmationResult } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useOnboardingMutations } from './use-onboarding-mutations';
import { useRecaptcha } from './use-recaptcha';
import { createClient } from '@/lib/supabase/client';
import { useTourStore } from '@/components/tour/tour-store';

type OnboardingStep = 'phone' | 'otp';

interface FormData {
  phoneNumber: string;
  isReturningUser: boolean;
  existingUserData: { name: string; role: string } | null;
}

export function useOnboardingFlow(role: string) {
  const router = useRouter();
  const { toast } = useToast();
  const mutations = useOnboardingMutations();
  const { initializeRecaptcha, clearRecaptcha } = useRecaptcha();
  const supabase = createClient();
  const { startTour, hasCompletedTour } = useTourStore();

  const [step, setStep] = useState<OnboardingStep>('phone');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [formData, setFormData] = useState<FormData>({
    phoneNumber: '',
    isReturningUser: false,
    existingUserData: null,
  });

  const otpSentRef = useRef(false);

  // Minimal E.164 normalization and validation (no extra deps)
  const normalizeE164 = useCallback(
    (raw: string) => (raw ?? '').replace(/\s+/g, ''),
    []
  );
  const isE164 = useCallback(
    (phone: string) => /^\+[1-9]\d{7,14}$/.test(phone),
    []
  );

  const sendOtpOnce = useCallback(
    async (phoneNumber?: string) => {
      const phoneToUse = normalizeE164(phoneNumber ?? formData.phoneNumber);

      if (otpSentRef.current || !phoneToUse || !isE164(phoneToUse)) {
        if (!isE164(phoneToUse)) {
          toast({
            variant: 'destructive',
            title: 'Invalid number',
            description: 'Enter a valid phone number with country code.',
          });
        }
        return;
      }

      otpSentRef.current = true;
      setIsSubmitting(true);
      try {
        console.log('🔐 Initializing reCAPTCHA...');
        const verifier = initializeRecaptcha();
        if (!verifier) {
          console.error('❌ reCAPTCHA initialization failed');
          throw new Error('Failed to initialize reCAPTCHA.');
        }
        console.log('✅ reCAPTCHA initialized, sending OTP...');

        const confirmation = await mutations.sendOTP.mutateAsync({
          phoneNumber: phoneToUse,
          recaptchaVerifier: verifier,
        });
        console.log('✅ OTP sent successfully, confirmation received');
        setConfirmationResult(confirmation);
      } catch (error) {
        console.error('❌ sendOtpOnce error:', error);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      formData.phoneNumber,
      initializeRecaptcha,
      mutations.sendOTP,
      normalizeE164,
      isE164,
      toast,
    ]
  );

  const handlePhoneSubmit = useCallback(
    async (rawPhone: string) => {
      const phone = normalizeE164(rawPhone);
      if (!phone || !isE164(phone)) {
        toast({
          variant: 'destructive',
          title: 'Invalid number',
          description: 'Enter a valid phone number with country code.',
        });
        return;
      }

      setFormData((p) => ({
        ...p,
        phoneNumber: phone,
        isReturningUser: false,
        existingUserData: null,
      }));
      setStep('otp');

      await sendOtpOnce(phone);
    },
    [sendOtpOnce, normalizeE164, isE164, toast]
  );

  const handleOtpSubmit = useCallback(
    async (otp: string) => {
      setIsSubmitting(true);

      try {
        // Confirmation result should always exist at this point since OTP is sent during phone submission
        if (!confirmationResult) {
          console.error(
            '❌ No confirmation result - OTP should have been sent during phone submission'
          );
          throw new Error('Please go back and re-enter your phone number.');
        }

        // Verify the OTP
        const user = await mutations.verifyOTP.mutateAsync({
          confirmationResult,
          otp,
        });

        if (user) {
          // Post-OTP: safe to check DB with authenticated token
          const { data: existing } = await supabase
          .from('profiles')
          .select('id, name, role, phone')
          .eq('phone', formData.phoneNumber)
          .maybeSingle();

          if (existing) {
            // Why it matters: RLS uses auth.jwt()->>'sub' = profiles.id. If the row was created earlier with a different uid (emulator vs prod, old bug that inserted before OTP, data migration, or mixed environments), the current user would sign in, but all profile/contacts/messages queries would fail RLS because id ≠ current uid.
            if (existing.id !== user.uid) {
              // Move ownership of the phone to this uid; allow 23505-safe path
              await mutations.updateExistingProfile.mutateAsync({
                uid: user.uid,
                phone: formData.phoneNumber,
              });
            }

            if (existing.role !== role) {
              toast({
                title: 'Signed in to your existing account',
                description: `This phone number is already registered as ${existing.role}. Redirecting…`,
              });
            } else {
              toast({
                title: 'Welcome back!',
                description: existing.name
                  ? `Signed in as ${existing.name}`
                  : 'Signed in.',
              });
            }
            router.push(`/${existing.role}`);
            return;
          }

          // No row by phone → create fresh
          await mutations.createProfile.mutateAsync({
            uid: user.uid,
            role,
            phone: formData.phoneNumber,
            name: null,
          });

          // Trigger tour for new users after successful profile creation
          if (!hasCompletedTour) {
            // Small delay to allow page transition to complete
            setTimeout(() => {
              startTour();
            }, 2000);
          }

          router.push(`/${role}`);
        }
      } catch (_error) {
        // Error already handled in mutations
        setIsSubmitting(false);
      }
    },
    [
      confirmationResult,
      formData,
      initializeRecaptcha,
      mutations,
      role,
      router,
      toast,
    ]
  );

  const handleBackToPhone = useCallback(() => {
    otpSentRef.current = false; // reset guard
    clearRecaptcha();
    setStep('phone');
    setConfirmationResult(null);
    setFormData({
      phoneNumber: '',
      isReturningUser: false,
      existingUserData: null,
    });
  }, [clearRecaptcha]);

  const getStepTitle = useCallback(() => {
    if (
      step === 'otp' &&
      formData.isReturningUser &&
      formData.existingUserData
    ) {
      return `Welcome back, ${formData.existingUserData.name}!`;
    }
    return `Welcome, ${role === 'teacher' ? 'Teacher' : 'Parent'}!`;
  }, [step, formData, role]);

  const getStepDescription = useCallback(() => {
    if (step === 'otp' && formData.isReturningUser) {
      return 'Enter the verification code to sign in.';
    }
    if (step === 'otp') {
      return 'Enter the verification code to complete signup.';
    }
    return "Let's get you signed in.";
  }, [step, formData]);

  return {
    step,
    formData,
    isSubmitting,
    confirmationResult,
    handlers: {
      handlePhoneSubmit,
      handleOtpSubmit,
      handleBackToPhone,
    },
    getStepTitle,
    getStepDescription,
    mutations,
  };
}
