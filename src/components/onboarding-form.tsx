
"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import Logo from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';

const phoneFormSchema = z.object({
  phoneNumber: z.string().min(10, { message: 'Please enter a valid phone number, including country code.' }),
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
  const [phoneNumber, setPhoneNumber] = useState('');

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
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
    return <div className="flex items-center justify-center min-h-screen">Invalid role selected. Go back to the <a href="/" className="underline pl-1">home page</a>.</div>;
  }
  
  async function onPhoneSubmit(values: z.infer<typeof phoneFormSchema>) {
    setIsSubmitting(true);
    setPhoneNumber(values.phoneNumber);

    const { error } = await supabase.auth.signInWithOtp({
      phone: values.phoneNumber,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error sending OTP',
        description: error.message,
      });
      setIsSubmitting(false);
    } else {
      toast({
        title: 'OTP Sent',
        description: 'Check your phone for the verification code.',
      });
      setStep(2);
      setIsSubmitting(false);
    }
  }

  async function onOtpSubmit(values: z.infer<typeof otpFormSchema>) {
     setIsSubmitting(true);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: values.otp,
      type: 'sms',
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Invalid OTP',
        description: error.message,
      });
      setIsSubmitting(false);
    } else {
      // User is signed in. Now, upsert their profile.
      if (data.session) {
         const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: data.session.user.id, role: role, phone: phoneNumber }, { onConflict: 'id' });

          if(profileError) {
             toast({
                variant: 'destructive',
                title: 'Profile Error',
                description: 'Could not save your profile. Please try again.',
            });
            setIsSubmitting(false);
            return;
          }
      }
      toast({
        title: 'Success!',
        description: "You're now signed in.",
      });
      router.push(`/${role}`);
    }
  }
  
  const title = `Welcome, ${role === 'teacher' ? 'Teacher' : 'Parent'}!`;
  const description = "Let's get you signed in with your phone number.";

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
              {step === 1 && (
                <Form {...phoneForm}>
                  <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
                    <FormField
                      control={phoneForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+15551234567" {...field} />
                          </FormControl>
                           <FormDescription>
                            Include your country code.
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
                            Enter the 6-digit code we sent to {phoneNumber}.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                       {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                       Verify and Sign In
                    </Button>
                     <Button variant="link" size="sm" className="w-full" onClick={() => setStep(1)}>
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
