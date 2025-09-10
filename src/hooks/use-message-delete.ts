// src/hooks/use-message-delete.ts
'use client';

import { type ChatMessage } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import type { SupabaseChannel } from '@/lib/supabase/types';
const EVENT_MESSAGE_DELETE = 'message_delete';

export function useMessageDelete(contactId: string, channel: SupabaseChannel) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.uid) throw new Error('User not authenticated');

      console.log('🗑️ Deleting message:', messageId);
      console.log('👤 Current user:', user.uid);

      const { data, error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.uid) // Can only delete own messages
        .select()
        .single();

      if (error) {
        console.error('❌ Error deleting message:', error);
        console.error('❌ Error details:', {
          messageId,
          userId: user.uid,
        });
        throw error;
      }

      console.log('✅ Database delete successful:', data);

      const broadcastChannel = supabase.channel(channel?.topic ?? '');

      try {
        await broadcastChannel.send({
          type: 'broadcast',
          event: EVENT_MESSAGE_DELETE,
          payload: {
            messageId,
            deletedBy: user.uid,
            deletedAt: new Date().toISOString(),
          },
        });
        console.log('📤 Delete broadcast sent successfully');
      } catch (broadcastError) {
        console.warn(
          '⚠️ Broadcast failed, but database delete succeeded:',
          broadcastError
        );
      } finally {
        // Clean up the temporary channel
        supabase.removeChannel(broadcastChannel);
      }

      return messageId;
    },
    onSuccess: (messageId) => {
      console.log('✅ Message deleted successfully:', messageId);

      // Remove from local cache
      queryClient.setQueryData<ChatMessage[]>(
        ['messages', contactId],
        (old = []) => {
          return old.filter((msg) => msg.id !== messageId);
        }
      );

      toast({
        title: 'Message deleted',
        description: 'Your message has been removed.',
      });
    },
    onError: (error: any) => {
      console.error('❌ Message delete error:', error);

      let errorMessage = 'Could not delete the message. Please try again.';

      if (error.code === 'PGRST116') {
        errorMessage =
          'Message not found or you do not have permission to delete it.';
      } else if (error.message?.includes('Row Level Security')) {
        errorMessage = 'You can only delete your own messages.';
      }

      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: errorMessage,
      });
    },
  });

  return {
    deleteMessage: deleteMessage.mutate,
    isDeleting: deleteMessage.isPending,
    deleteError: deleteMessage.error,
  };
}
