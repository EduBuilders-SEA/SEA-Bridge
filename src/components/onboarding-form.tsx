'use client';

import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useOnboardingFlow } from '@/hooks/use-onboarding-flow';
import { useCurrentProfile } from '@/hooks/use-profile';
import {
  OtpSchema,
  PhoneSchema,
  type OtpForm,
  type PhoneForm,
} from '@/lib/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import PhoneInput from 'react-phone-number-input';

const phoneFormSchema = PhoneSchema;
const otpFormSchema = OtpSchema;

export default function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();

  // Use the custom onboarding flow hook
  const {
    step,
    formData,
    isSubmitting,
    handlers: { handlePhoneSubmit, handleOtpSubmit, handleBackToPhone },
    getStepTitle,
    getStepDescription,
  } = useOnboardingFlow(role ?? '');

  // Check if user already has a profile and redirect them
  useEffect(() => {
    if (!loading && !profileLoading) {
      if (user && profile) {
        // User is authenticated and has a profile, redirect to appropriate dashboard
        router.push(`/${profile.role}`);
      }
    }
  }, [user, profile, loading, profileLoading, router]);

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: '',
    },
  });

  // Form submission handlers using custom hook handlers
  const onPhoneSubmit = (values: PhoneForm) => {
    handlePhoneSubmit(values.phoneNumber);
  };

  const onOtpSubmit = (values: OtpForm) => {
    handleOtpSubmit(values.otp);
  };

  if (!role || (role !== 'teacher' && role !== 'parent')) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        Invalid role selected. Go back to the
        <Link href='/' className='underline pl-1'>
          home page
        </Link>
        .
      </div>
    );
  }

  // Show loading state while checking auth and profile
  if (loading || profileLoading) {
    return (
      <div className='flex min-h-screen w-full bg-background items-center justify-center p-4'>
        <div className='text-center'>
          <Loader2 className='animate-spin h-8 w-8 mx-auto mb-2' />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex min-h-screen w-full bg-background items-center justify-center p-4'>
      <main className='w-full max-w-md'>
        <Card>
          <CardHeader className='text-center'>
            <Logo className='w-32 mx-auto mb-4' />
            <CardTitle className='font-headline'>{getStepTitle()}</CardTitle>
            <CardDescription className='font-body'>
              {getStepDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div id='recaptcha-container'></div>
            {step === 'phone' && (
              <Form {...phoneForm}>
                <form
                  onSubmit={phoneForm.handleSubmit(onPhoneSubmit)}
                  className='space-y-6'
                >
                  <FormField
                    control={phoneForm.control}
                    name='phoneNumber'
                    render={({ field: _field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Controller
                            name='phoneNumber'
                            control={phoneForm.control}
                            render={({ field }) => (
                              <PhoneInput
                                {...field}
                                placeholder='Enter phone number'
                                international
                                defaultCountry='US'
                                className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
                              />
                            )}
                          />
                        </FormControl>
                        <FormDescription>
                          We'll verify your phone number first.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type='submit'
                    className='w-full'
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className='animate-spin mr-2' />}
                    Continue
                  </Button>
                </form>
              </Form>
            )}
            {step === 'otp' && (
              <Form {...otpForm}>
                <form
                  onSubmit={otpForm.handleSubmit(onOtpSubmit)}
                  className='space-y-6'
                >
                  <FormField
                    control={otpForm.control}
                    name='otp'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input placeholder='123456' {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the 6-digit code we sent to{' '}
                          {formData.phoneNumber}.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type='submit'
                    className='w-full'
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className='animate-spin mr-2' />}
                    {formData.isReturningUser ? 'Sign In' : 'Complete Signup'}
                  </Button>
                  <Button
                    variant='link'
                    size='sm'
                    className='w-full'
                    onClick={handleBackToPhone}
                  >
                    Use a different phone number
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
