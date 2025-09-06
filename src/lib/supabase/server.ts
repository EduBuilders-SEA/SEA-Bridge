'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';


export async function createClient(accessToken?: string) {
  if (accessToken) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        accessToken: async () => accessToken,
      }
    );
  }

  // Try to get token from Authorization header
  const headerStore = headers();
  const authHeader = (await headerStore).get('authorization');
  const tokenFromHeader = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => tokenFromHeader,
    }
  );


}
