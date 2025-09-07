'use client';

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from './use-auth';

type Message = Database['public']['Tables']['messages']['Row'];

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
          const newMessage = payload.new as Message;
          
          // Update React Query infinite query cache
          queryClient.setQueryData<{ pages: Message[][]; pageParams: unknown[] }>(
            ['messages', contactLinkId],
            (old) => {
              if (!old) {
                return { pages: [[newMessage]], pageParams: [0] };
              }

              const newPages = [...old.pages];
              if (newPages.length === 0) {
                newPages.push([newMessage]);
              } else {
                // Check if message already exists (avoid duplicates from optimistic updates)
                const exists = newPages.some(page => 
                  page.some(m => m.id === newMessage.id)
                );
                
                if (!exists) {
                  // Add to the first page (most recent)
                  newPages[0] = [newMessage, ...newPages[0]];
                }
              }

              return { ...old, pages: newPages };
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, contactLinkId, queryClient, supabase]);
}
