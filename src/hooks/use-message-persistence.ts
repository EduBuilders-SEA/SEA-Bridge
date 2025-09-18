'use client';

import { SendMessageSchema, type SendMessageData } from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import { useMutation } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useAuth } from './use-auth';

export function useMessagePersistence() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const persistMessage = useMutation({
    mutationFn: async (data: SendMessageData) => {
      if (!user?.uid) throw new Error('User not authenticated');

      // ✅ DRY: Validate with Zod
      const validatedData = SendMessageSchema.parse(data);

      // ✅ DRY: Transform to database format
      const messageInsert: Database['public']['Tables']['messages']['Insert'] =
        {
          id: validatedData.id, // carry client id if present
          contact_link_id: validatedData.contact_link_id,
          sender_id: user.uid,
          content: validatedData.content,
          message_type: validatedData.message_type,
          variants: validatedData.variants,
          file_url: validatedData.file_url,
          sent_at: validatedData.sent_at ?? new Date().toISOString(),
        };

      const { data: result, error } = await supabase
        .from('messages')
        .insert(messageInsert)
        .select()
        .single();

      if (error) {
        console.error('❌ Error persisting message:', error);
        throw error;
      }

      return result;
    },
    onError: (error) => {
      console.error('❌ Message persistence error:', error);
    },
  });

  return {
    persistMessage: persistMessage.mutate,
    isPersisting: persistMessage.isPending,
    persistError: persistMessage.error,
  };
}
