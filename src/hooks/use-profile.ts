'use client';

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

export function useProfile() {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['profile', user?.uid],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.uid)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}
