'use client';

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useCurrentProfile } from './use-profile';

const PAGE_SIZE = 30;

type Message = Database['public']['Tables']['messages']['Row'];
type InsertMessage = Database['public']['Tables']['messages']['Insert'];

// UI Message type that matches what the chat components expect
export type UIMessage = {
  id: string;
  sender: 'teacher' | 'parent';
  content: string;
  timestamp: string;
  type: 'text' | 'document' | 'voice';
  originalLanguage?: string;
  fileUrl?: string;
  // Extended properties for AI features
  translatedContent?: string;
  isTranslating?: boolean;
  simplifiedContent?: string;
  isSimplifying?: boolean;
  transcription?: string;
  isTranscribing?: boolean;
  audioDataUri?: string;
  summary?: string;
  isSummarizing?: boolean;
};

export function useMessages(contactLinkId: string) {
  const { user } = useAuth();
  const { data: profile } = useCurrentProfile();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Helper function to transform database message to UI message
  const transformMessage = (dbMessage: Message): UIMessage => {
    // Determine sender based on the sender_id and current user profile
    const isCurrentUser = dbMessage.sender_id === user?.uid;
    const sender = isCurrentUser ? (profile?.role as 'teacher' | 'parent') : 
                   (profile?.role === 'teacher' ? 'parent' : 'teacher');

    return {
      id: dbMessage.id,
      sender,
      content: dbMessage.content,
      timestamp: new Date(dbMessage.sent_at ?? '').toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      type: (dbMessage.message_type as 'text' | 'document' | 'voice') ?? 'text',
      fileUrl: dbMessage.file_url ?? undefined,
      originalLanguage: 'English', // Default, could be extended to store in variants
    };
  };

  const messagesQuery = useInfiniteQuery({
    queryKey: ['messages', contactLinkId],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_link_id', contactLinkId)
        .order('sent_at', { ascending: false }) // Most recent first for pagination
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (error) throw error;
      return data as Message[];
    },
    getNextPageParam: (lastPage: Message[], allPages: Message[][]) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
    enabled: !!user && !!contactLinkId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Flatten, reverse to get chronological order, and transform to UI format
  const messages: UIMessage[] = messagesQuery.data?.pages
    .flat()
    .reverse()
    .map(transformMessage) ?? [];

  const sendMessageMutation = useMutation({
    mutationFn: async (newMessage: Omit<InsertMessage, 'id' | 'sent_at' | 'contact_link_id' | 'sender_id'>) => {
      const messageData: InsertMessage = {
        ...newMessage,
        contact_link_id: contactLinkId,
        sender_id: user?.uid ?? '',
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newMessage) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', contactLinkId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['messages', contactLinkId]);

      // Create optimistic message with temporary ID
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        contact_link_id: contactLinkId,
        sender_id: user?.uid ?? '',
        content: newMessage.content,
        message_type: newMessage.message_type ?? 'text',
        file_url: newMessage.file_url ?? null,
        sent_at: new Date().toISOString(),
        variants: null,
      };

      // Optimistically update the cache
      queryClient.setQueryData<{ pages: Message[][]; pageParams: unknown[] }>(
        ['messages', contactLinkId],
        (old) => {
          if (!old) {
            return { pages: [[tempMessage]], pageParams: [0] };
          }

          const newPages = [...old.pages];
          if (newPages.length === 0) {
            newPages.push([tempMessage]);
          } else {
            // Add to the first page (most recent)
            newPages[0] = [tempMessage, ...newPages[0]];
          }

          return { ...old, pages: newPages };
        }
      );

      return { previousMessages, tempMessage };
    },
    onError: (err, newMessage, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', contactLinkId], context.previousMessages);
      }
    },
    onSettled: () => {
      // Always invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['messages', contactLinkId] });
    },
  });

  return {
    messages,
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    fetchNextPage: messagesQuery.fetchNextPage,
    hasNextPage: messagesQuery.hasNextPage,
    isFetchingNextPage: messagesQuery.isFetchingNextPage,
  };
}
