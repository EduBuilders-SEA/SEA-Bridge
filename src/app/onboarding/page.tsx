"use client";

import { Suspense } from 'react';
import OnboardingForm from '@/components/onboarding-form';
import { Skeleton } from '@/components/ui/skeleton';
import Script from 'next/script';

function OnboardingSkeleton() {
  return (
    <div className="flex min-h-screen w-full bg-background items-center justify-center p-4">
       <main className="w-full max-w-md">
        <div className="w-full max-w-md p-4 sm:p-8 text-center">
            <div className="max-w-4xl w-full flex flex-col items-center">
                <Skeleton className="w-32 h-16 mx-auto mb-4" />
                <Skeleton className="h-8 w-1/2 mb-4" />
                <Skeleton className="h-6 w-3/4 mb-8" />
                <div className="space-y-6 w-full">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        </div>
      </main>
    </div>
  )
}

export default function OnboardingPage() {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const recaptchaSrc = recaptchaSiteKey
    ? `https://www.google.com/recaptcha/enterprise.js?render=${recaptchaSiteKey}`
    : undefined;
  return (
    <>
      <Script 
        src={recaptchaSrc}
        strategy="beforeInteractive"
      />
      <Suspense fallback={<OnboardingSkeleton />}>
        <OnboardingForm />
      </Suspense>
    </>
  );
}
