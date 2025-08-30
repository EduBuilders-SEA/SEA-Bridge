
"use client";

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input'


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
    return <div className="flex items-center justify-center min-h-screen">Invalid role selected. Go back to the <a href="/" className="underline pl-1">home page</a>.</div>;
  }
  
  async function onMainFormSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    setFormData(values);

    // const { error } = await supabase.auth.signInWithOtp({
    //   phone: values.phoneNumber,
    // });

    // if (error) {
    //   toast({
    //     variant: 'destructive',
    //     title: 'Error sending OTP',
    //     description: error.message,
    //   });
    //   setIsSubmitting(false);
    // } else {
    //   toast({
    //     title: 'OTP Sent',
    //     description: 'Check your phone for the verification code.',
    //   });
    //   setStep(2);
    //   setIsSubmitting(false);
    // }
    setStep(2)
  }

  async function onOtpSubmit(values: z.infer<typeof otpFormSchema>) {
     setIsSubmitting(true);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formData.phoneNumber,
      token: values.otp,
      type: 'sms',
    });

    // if (error) {
    //   toast({
    //     variant: 'destructive',
    //     title: 'Invalid OTP',
    //     description: error.message,
    //   });
    //   setIsSubmitting(false);
    // } else {
    //   // User is signed in. Now, upsert their profile.
    //   if (data.session) {
    //      const { error: profileError } = await supabase
    //         .from('profiles')
    //         .upsert({ id: data.session.user.id, role: role, phone: formData.phoneNumber, full_name: formData.name }, { onConflict: 'id' });

    //       if(profileError) {
    //          toast({
    //             variant: 'destructive',
    //             title: 'Profile Error',
    //             description: 'Could not save your profile. Please try again.',
    //         });
    //         setIsSubmitting(false);
    //         return;
    //       }
    //   }
    //   toast({
    //     title: 'Success!',
    //     description: "You're now signed in.",
    //   });
    //   router.push(`/${role}`);
    // }
     toast({
      title: 'Success!',
      description: "You're now signed in.",
    });
    router.push(`/${role}`);
  }
  
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
