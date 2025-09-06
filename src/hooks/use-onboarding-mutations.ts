import { useMutation } from '@tanstack/react-query';
import { signInWithPhoneNumber } from 'firebase/auth';
import type { ConfirmationResult , RecaptchaVerifier } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useOnboardingMutations() {
  const supabase = createClient();
  const { toast } = useToast();

  const checkExistingUser = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('phone', phoneNumber)
        .single();

      return existingProfile;
    },
    onError: (error) => {
      console.warn('Error checking existing user:', error);
    },
  });

  const sendOTP = useMutation({
    mutationFn: async ({ phoneNumber, recaptchaVerifier }: { 
      phoneNumber: string; 
      recaptchaVerifier: RecaptchaVerifier 
    }): Promise<ConfirmationResult> => {
      
      if (!recaptchaVerifier) {
        console.error('❌ reCAPTCHA not initialized');
        throw new Error('reCAPTCHA not initialized. Please refresh the page.');
      }

      try {
        const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        return confirmation;
      } catch (error) {
        console.error('❌ Firebase signInWithPhoneNumber failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Verification code sent',
        description: 'Please check your phone for the code.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error sending code',
        description: (error as Error).message || 'Failed to send verification code. Please try again.',
      });
    },
  });

  const verifyOTP = useMutation({
    mutationFn: async ({ 
      confirmationResult, 
      otp 
    }: { 
      confirmationResult: ConfirmationResult; 
      otp: string 
    }) => {
      const result = await confirmationResult.confirm(otp);
      return result.user;
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Invalid code',
        description: (error as Error).message || 'Please check the verification code and try again.',
      });
    },
  });

  const createProfile = useMutation({
    mutationFn: async ({ 
      uid, 
      role, 
      phone, 
      name 
    }: { 
      uid: string; 
      role: string; 
      phone: string; 
      name: string | null 
    }) => {
      const { error } = await supabase
        .from('profiles')
        .insert({ id: uid, role, phone, name });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Welcome!',
        description: 'Your account has been created.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Profile Error',
        description: 'Could not save your profile. Please try again.',
      });
    },
  });

  const updateExistingProfile = useMutation({
    mutationFn: async ({ uid, phone }: { uid: string; phone: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ id: uid })
        .eq('phone', phone);

      // Ignore unique constraint errors
      if (error && error.code !== '23505') {
        throw error;
      }
    },
    onError: (error) => {
      console.warn('Profile ID update error:', error);
    },
  });

  return {
    checkExistingUser,
    sendOTP,
    verifyOTP,
    createProfile,
    updateExistingProfile,
  };
}