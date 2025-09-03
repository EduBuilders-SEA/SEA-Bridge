"use client";

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getAuth } from 'firebase/auth';
import app from '@/lib/firebase/config';

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        const auth = getAuth(app);
        return (await auth.currentUser?.getIdToken(false)) ?? null;
      },
    }
  );
}
