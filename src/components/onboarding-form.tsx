
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import Logo from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { auth } from '@/lib/firebase/config';
import { signInWithPhoneNumber, RecaptchaVerifier } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import Link from 'next/link';


const formSchema = z.object({
  name: z.string().min(2, { message: "Please enter your full name." }),
  phoneNumber: z.string().refine(isValidPhoneNumber, { message: 'Please enter a valid phone number.' }),
});

const otpFormSchema = z.object({
  otp: z.string().min(6, { message: 'OTP must be 6 digits.' }),
});

export default function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const { toast } = useToast();
  const supabase = createClient();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', phoneNumber: '' });
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState<RecaptchaVerifier | null>(null);

  // Initialize reCAPTCHA verifier once when component mounts
  useEffect(() => {
    const initializeRecaptcha = () => {
      try {
        if (!recaptchaVerifier && typeof window !== 'undefined') {
          const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => {
              // reCAPTCHA solved
            }
          });
          setRecaptchaVerifier(verifier);
        }
      } catch (error) {
        console.warn('Failed to initialize reCAPTCHA:', error);
      }
    };

    initializeRecaptcha();

    // Cleanup function
    return () => {
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (error) {
          console.warn('Failed to clear reCAPTCHA:', error);
        }
      }
    };
  }, [recaptchaVerifier]);


  const mainForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
    },
  });

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: '',
    },
  });


  if (!role || (role !== 'teacher' && role !== 'parent')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Invalid role selected. Go back to the
        <Link href="/" className="underline pl-1">home page</Link>.
      </div>
    );
  }
  
  async function onMainFormSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setFormData(values);

    try {
      if (!recaptchaVerifier) {
        throw new Error('reCAPTCHA not initialized. Please refresh the page.');
      }

      // Send SMS verification code using existing verifier
      const confirmation = await signInWithPhoneNumber(auth, values.phoneNumber, recaptchaVerifier);
      setConfirmationResult(confirmation);
      
      toast({
        title: 'OTP Sent',
        description: 'Check your phone for the verification code.',
      });
      setStep(2);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error sending OTP',
        description: error.message || 'Failed to send verification code',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onOtpSubmit(values: z.infer<typeof otpFormSchema>) {
    setIsSubmitting(true);

    try {
      if (!confirmationResult) {
        throw new Error('No confirmation result available');
      }

      // Verify the OTP with Firebase
      const result = await confirmationResult.confirm(values.otp);
      const user = result.user;

      if (user) {
        // User is signed in with Firebase. Now, upsert their profile in Supabase
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.uid, 
            role, 
            phone: formData.phoneNumber, 
            name: formData.name 
          }, { onConflict: 'id' });

        if (profileError) {
          toast({
            variant: 'destructive',
            title: 'Profile Error',
            description: 'Could not save your profile. Please try again.',
          });
          setIsSubmitting(false);
          return;
        }

        toast({
          title: 'Success!',
          description: "You're now signed in.",
        });
        router.push(`/${role}`);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Invalid OTP',
        description: error.message || 'Invalid verification code',
      });
      setIsSubmitting(false);
    }
  }

  // Function to handle going back to step 1
  const handleBackToStep1 = () => {
    setStep(1);
    setConfirmationResult(null);
    // Reset forms
    mainForm.reset();
    otpForm.reset();
  };
  
  const title = `Welcome, ${role === 'teacher' ? 'Teacher' : 'Parent'}!`;
  const description = "Let's get you signed in.";

  return (
    <div className="flex min-h-screen w-full bg-background items-center justify-center p-4">
      <main className="w-full max-w-md">
        <Card>
            <CardHeader className="text-center">
                 <Logo className="w-32 mx-auto mb-4" />
                <CardTitle className="font-headline">{title}</CardTitle>
                <CardDescription className="font-body">{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div id="recaptcha-container"></div>
              {step === 1 && (
                <Form {...mainForm}>
                  <form onSubmit={mainForm.handleSubmit(onMainFormSubmit)} className="space-y-6">
                    <FormField
                        control={mainForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Jane Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                      control={mainForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Controller
                                name="phoneNumber"
                                control={mainForm.control}
                                render={({ field }) => (
                                    <PhoneInput
                                        {...field}
                                        placeholder="Enter phone number"
                                        international
                                        defaultCountry="US"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                    />
                                )}
                            />
                          </FormControl>
                           <FormDescription>
                            We'll text you a verification code.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                      Send Verification Code
                    </Button>
                  </form>
                </Form>
              )}
               {step === 2 && (
                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Code</FormLabel>
                          <FormControl>
                            <Input placeholder="123456" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter the 6-digit code we sent to {formData.phoneNumber}.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                       {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                       Verify and Sign In
                    </Button>
                     <Button variant="link" size="sm" className="w-full" onClick={handleBackToStep1}>
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

    
