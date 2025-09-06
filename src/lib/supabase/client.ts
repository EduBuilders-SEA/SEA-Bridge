'use client';

import app from '@/lib/firebase/config';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getAuth } from 'firebase/auth';

export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user) return null;
        // Try cached token; refresh if near expiry
        const result = await user.getIdTokenResult(false);
        const expMs = result?.expirationTime
          ? new Date(result.expirationTime).getTime()
          : 0;
        if (Date.now() > expMs - 60_000) {
          return await user.getIdToken(true);
        }
        return result.token;
      },
    }
  );
}
