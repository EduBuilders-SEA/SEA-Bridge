
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookUser, Users, LogIn } from 'lucide-react';
import Link from 'next/link';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import Logo from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUserRole(null);
        router.refresh();
    };

    if (loading) {
        return (
             <div className="flex min-h-screen w-full bg-background">
                <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center">
                    <div className="max-w-4xl w-full flex flex-col items-center">
                        <Skeleton className="w-48 h-24 mb-4" />
                        <Skeleton className="h-12 w-1/2 mb-4" />
                        <Skeleton className="h-8 w-3/4" />

                        <div className="mt-12 w-full max-w-2xl">
                             <Skeleton className="h-8 w-1/3 mx-auto mb-8" />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Skeleton className="h-48" />
                                <Skeleton className="h-48" />
                             </div>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    if (userRole) {
        return (
            <div className="flex min-h-screen w-full bg-background">
              <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center">
                <div className="max-w-4xl w-full">
                  <Logo className="w-48 mx-auto mb-4" />
                  <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary tracking-tight">
                    Welcome Back!
                  </h1>
                   <p className="mt-4 text-lg sm:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
                    You are signed in as a {userRole}.
                  </p>
                  <div className="mt-12 flex flex-col items-center gap-4">
                     <Button asChild size="lg">
                        <Link href={`/${userRole}`}>
                            <LogIn className="mr-2" />
                            Go to my Dashboard
                        </Link>
                     </Button>
                     <Button variant="link" onClick={handleLogout}>Not you? Log out</Button>
                  </div>
                </div>
              </main>
            </div>
        )
    }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center">
        <div className="max-w-4xl w-full">
          <Logo className="w-48 mx-auto mb-4" />
          <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary tracking-tight">
            SEA Bridge
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-muted-foreground font-body max-w-2xl mx-auto">
            Breaking down language barriers in education. Real-time, AI-powered communication for a global classroom.
          </p>
          <div className="mt-12">
            <h2 className="text-2xl font-headline font-semibold text-foreground">
              Choose your role to begin
            </h2>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              <Link href="/onboarding?role=teacher" className="h-full">
                <Card className="text-left hover:shadow-lg hover:border-primary transition-all duration-300 cursor-pointer h-full flex flex-col">
                  <CardHeader className="flex-1">
                    <div className="bg-primary/10 text-primary p-3 rounded-full w-fit mb-4">
                      <BookUser className="w-8 h-8" />
                    </div>
                    <CardTitle className="font-headline">I am a Teacher</CardTitle>
                    <CardDescription className="font-body">
                      Send messages, documents, and voice notes to parents.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
              <Link href="/onboarding?role=parent" className="h-full">
                <Card className="text-left hover:shadow-lg hover:border-primary transition-all duration-300 cursor-pointer h-full flex flex-col">
                  <CardHeader className="flex-1">
                    <div className="bg-primary/10 text-primary p-3 rounded-full w-fit mb-4">
                      <Users className="w-8 h-8" />
                    </div>
                    <CardTitle className="font-headline">I am a Parent</CardTitle>
                    <CardDescription className="font-body">
                      Receive translated and simplified updates about your child.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
