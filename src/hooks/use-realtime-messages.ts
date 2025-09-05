"use client";

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
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
          queryClient.setQueryData(['messages', contactLinkId], (old: any) => 
            old ? [...old, payload.new] : [payload.new]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, contactLinkId, queryClient, supabase]);
}