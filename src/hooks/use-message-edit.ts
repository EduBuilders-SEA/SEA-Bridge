'use client';

import {
  EditMessageSchema,
  type ChatMessage,
  type EditMessageData,
} from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import type { SupabaseChannel } from '@/lib/supabase/types';
const EVENT_MESSAGE_EDIT = 'message_edit';

export function useMessageEdit(
  contactId: string,
  channel: SupabaseChannel
) {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const editMessage = useMutation({
    mutationFn: async ({
      messageId,
      content,
    }: { messageId: string } & EditMessageData) => {
      if (!user?.uid) throw new Error('User not authenticated');

      // Validate input
      const validatedData = EditMessageSchema.parse({ content });

      console.log('✏️ Editing message:', messageId);
      console.log('👤 Current user:', user.uid);

      const { data, error } = await supabase
        .from('messages')
        .update({
          content: validatedData.content,
        })
        .eq('id', messageId)
        .eq('sender_id', user.uid)
        .select()
        .single();

      if (error) {
        console.error('❌ Error editing message:', error);
        console.error('❌ Error details:', {
          messageId,
          userId: user.uid,
          content: validatedData.content,
        });
        throw error;
      }

      console.log('✅ Database update successful:', data);

      if (!channel) {
        alert('Something went wrong. Please try again.');
        console.warn('⚠️ There is no channel to broadcast the message edit.');
        return;
      }

      try {

        await channel.send({
          type: 'broadcast',
          event: EVENT_MESSAGE_EDIT,
          payload: {
            messageId: data.id,
            content: data.content,
            editedBy: user.uid,
            editedAt: new Date().toISOString(),
          },
        });
        console.log('📤 Edit broadcast sent successfully');
      } catch (broadcastError) {
        console.warn(
          '⚠️ Broadcast failed, but database update succeeded:',
          broadcastError
        );
      } 

      return data;
    },
    onSuccess: (data) => {
      console.log('✅ Message edited successfully:', data.id);

      // Update local cache
      queryClient.setQueryData<ChatMessage[]>(
        ['messages', contactId],
        (old = []) => {
          return old.map((msg) =>
            msg.id === data.id ? { ...msg, content: data.content } : msg
          );
        }
      );

      toast({
        title: 'Message edited',
        description: 'Your message has been updated.',
      });
    },
    onError: (error: any) => {
      console.error('❌ Message edit error:', error);

      let errorMessage = 'Could not edit the message. Please try again.';

      if (error.code === 'PGRST116') {
        errorMessage =
          'Message not found or you do not have permission to edit it.';
      } else if (error.message?.includes('Row Level Security')) {
        errorMessage = 'You can only edit your own messages.';
      }

      toast({
        variant: 'destructive',
        title: 'Edit failed',
        description: errorMessage,
      });
    },
  });

  return {
    editMessage: editMessage.mutate,
    isEditing: editMessage.isPending,
    editError: editMessage.error,
  };
}
