'use client';

import { sendVoiceMessage } from '@/app/actions/voice-messages';
import { useAuth } from '@/hooks/use-auth';
import { useCurrentProfile } from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
import { useLanguageStore } from '@/components/store/language-store';
import type { SupabaseChannel } from '@/lib/supabase/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useVoiceMessages(
  contactLinkId: string,
  channel: SupabaseChannel
) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedLanguage } = useLanguageStore();
  const { data: profile } = useCurrentProfile();

  const sendVoice = useMutation({
    mutationFn: async ({
      audioDataUri,
      targetLanguage,
    }: {
      audioDataUri: string;
      targetLanguage: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Get access token
      const accessToken = await user.getIdToken();

      // Determine user's preferred language (selected language > profile preference > fallback)
      const userLanguage = selectedLanguage || profile?.preferred_language || 'English';

      console.warn('🎙️ Voice message with user language:', {
        selectedLanguage,
        profileLanguage: profile?.preferred_language,
        userLanguage,
        targetLanguage,
      });

      return sendVoiceMessage({
        contactLinkId,
        audioDataUri,
        targetLanguage,
        userLanguage, // Pass user's preferred language
        accessToken,
      });
    },
    onSuccess: (result) => {
      if (result.success && result.message) {
        // Broadcast the new voice message immediately using the singleton channel
        const message = result.message;

        if (channel) {
          // Create a ChatMessage-compatible payload
          const chatMessage = {
            id: message.id,
            contact_link_id: message.contact_link_id,
            sender_id: message.sender_id,
            content: message.content, // Will be "Voice note" initially
            message_type: message.message_type,
            sent_at: message.sent_at, // Use sent_at from database, not created_at
            variants: message.variants,
            file_url: message.file_url,
            user: {
              id: user?.uid ?? message.sender_id,
              name: user?.displayName ?? user?.email ?? 'Unknown',
            },
          };

          channel
            .send({
              type: 'broadcast',
              event: 'message',
              payload: chatMessage,
            })
            .then(() => {
              console.warn('📤 Voice message broadcast sent:', message.id);
            })
            .catch((error) => {
              console.error('📤 Voice message broadcast failed:', error);
            });
        }

        // Invalidate cache to ensure UI consistency
        queryClient.invalidateQueries({
          queryKey: ['messages', contactLinkId],
        });

        toast({
          title: 'Voice note sent',
          description: 'Your voice message is being processed.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error ?? 'Failed to send voice message',
        });
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to send voice message',
      });
    },
  });

  return {
    sendVoice: sendVoice.mutate,
    isSending: sendVoice.isPending,
  };
}
