'use client';

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from './use-auth';

export function useRealtimeMessages(contactLinkId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    if (!user || !contactLinkId) return;

    const channel = supabase
      .channel(`messages:${contactLinkId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `contact_link_id=eq.${contactLinkId}`,
        },
        (payload) => {
          // Update React Query cache instead of local state
          queryClient.setQueryData<
            Database['public']['Tables']['messages']['Row'][]
          >(['messages', contactLinkId], (old = []) => {
            const exists = old.some((m) => m.id === (payload.new as any).id);
            return exists
              ? old
              : [
                  ...old,
                  payload.new as Database['public']['Tables']['messages']['Row'],
                ];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, contactLinkId, queryClient, supabase]);
}
