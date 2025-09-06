'use client';

import { createClient } from '@/lib/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';

export function useMessages(contactLinkId: string) {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ['messages', contactLinkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_link_id', contactLinkId)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!contactLinkId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch messages
      queryClient.invalidateQueries({ queryKey: ['messages', contactLinkId] });
    },
  });

  return {
    messages: messagesQuery.data ?? [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
  };
}
