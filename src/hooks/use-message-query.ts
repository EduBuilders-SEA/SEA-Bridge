import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { MessageRowSchema, transformMessageRow, type ChatMessage } from '@/lib/schemas';

export function useMessageQuery(contactLinkId: string) {
  const supabase = createClient();
  const { user } = useAuth(); // ✅ Added: Need auth for RLS policies

  return useQuery({
    queryKey: ['messages', contactLinkId],
    queryFn: async (): Promise<ChatMessage[]> => {
      console.log(
        '📊 Fetching messages for:',
        contactLinkId,
        'user:',
        user?.uid
      );

      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(name)
        `
        )
        .eq('contact_link_id', contactLinkId)
        .order('sent_at', { ascending: true });

      if (error) {
        console.error('❌ Error fetching messages:', error);
        throw error;
      }

      console.log('✅ Raw messages from DB:', data?.length || 0);

      // ✅ DRY: Use Zod for validation and transformation
      try {
        const messages = (data || []).map((row, index) => {
          try {
            const validatedRow = MessageRowSchema.parse(row);
            return transformMessageRow(validatedRow);
          } catch (error) {
            console.error(`❌ Error validating message at index ${index}:`, error);
            console.error('❌ Raw message data:', row);
            console.error('❌ sent_at value:', row.sent_at, 'type:', typeof row.sent_at);
            throw error;
          }
        });

        console.log('✅ Transformed messages:', messages.length);
        return messages;
      } catch (error) {
        console.error('❌ Error in message transformation:', error);
        throw error;
      }
    },
    enabled: !!contactLinkId && !!user?.uid,
  });
}
