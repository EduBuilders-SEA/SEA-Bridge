"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Logo from '@/components/logo';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  phoneNumber: z.string().min(10, { message: 'Please enter a valid phone number.' }),
});

export default function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phoneNumber: '',
    },
  });

  useEffect(() => {
    // If user info is already in localStorage, redirect them
    const storedUser = localStorage.getItem('sea-bridge-user');
    if (storedUser) {
      const { role } = JSON.parse(storedUser);
      router.push(`/${role}`);
    }
  }, [router]);


  if (!role || (role !== 'teacher' && role !== 'parent')) {
    // Or redirect to home, or show an error
    return <div className="flex items-center justify-center min-h-screen">Invalid role selected. Go back to the <a href="/" className="underline pl-1">home page</a>.</div>;
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    const userProfile = {
      name: values.name,
      phoneNumber: values.phoneNumber,
      role: role
    };
    localStorage.setItem('sea-bridge-user', JSON.stringify(userProfile));
    router.push(`/${role}`);
  }
  
  const title = `Welcome, ${role === 'teacher' ? 'Teacher' : 'Parent'}!`;
  const description = "Let's get started by setting up your profile.";

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
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                    control={form.control}
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
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. +15555555555" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit" className="w-full">Continue</Button>
                </form>
                </Form>
            </CardContent>
        </Card>
      </main>
    </div>
  );
}
