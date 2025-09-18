'use client';

import { transcribeAndTranslate } from '@/ai/flows/transcribe-and-translate';
import { useLanguageStore } from '@/components/store/language-store';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface TranscribeVoiceMessageParams {
  messageId: string;
  audioDataUri: string;
  contactLinkId: string;
}

export function useVoiceTranscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { selectedLanguage } = useLanguageStore();

  const transcribeMessage = useMutation({
    mutationFn: async ({
      messageId,
      audioDataUri,
      contactLinkId: _contactLinkId,
    }: TranscribeVoiceMessageParams) => {
      if (!user?.uid || !selectedLanguage) {
        throw new Error('User not authenticated or no language selected');
      }

      const supabase = createClient();

      // Mark as transcribing
      const { error: startError } = await supabase
        .from('messages')
        .update({
          variants: {
            audioDataUri,
            isTranscribing: true,
          },
        })
        .eq('id', messageId);

      if (startError) {
        throw new Error(`Failed to start transcription: ${startError.message}`);
      }

      try {
        // Process transcription and translation to user's preferred language
        const result = await transcribeAndTranslate({
          audioDataUri,
          targetLanguage: selectedLanguage,
        });

        // Update the message with transcription and translation
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            variants: {
              audioDataUri,
              isTranscribing: false,
              transcription: result.transcription,
              translatedContent: result.translation,
              originalLanguage: 'Auto-detected',
              translatedLanguage: selectedLanguage,
              transcribedAt: new Date().toISOString(),
            },
          })
          .eq('id', messageId);

        if (updateError) {
          throw new Error(
            `Failed to update transcription: ${updateError.message}`
          );
        }

        return result;
      } catch (transcriptionError) {
        console.error('Transcription failed:', transcriptionError);

        // Update message to show error state
        await supabase
          .from('messages')
          .update({
            variants: {
              audioDataUri,
              isTranscribing: false,
              transcriptionError: 'Failed to process voice note',
            },
          })
          .eq('id', messageId);

        throw transcriptionError;
      }
    },
    onSuccess: (result, { contactLinkId }) => {
      // Invalidate messages to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ['messages', contactLinkId],
      });

      toast({
        title: 'Voice note transcribed',
        description: 'The voice message has been converted to text.',
      });
    },
    onError: (error, { contactLinkId }) => {
      console.error('Transcription error:', error);

      // Still invalidate to show the error state
      queryClient.invalidateQueries({
        queryKey: ['messages', contactLinkId],
      });

      toast({
        variant: 'destructive',
        title: 'Failed to transcribe voice note',
        description: error.message,
      });
    },
  });

  return {
    transcribeMessage: transcribeMessage.mutateAsync,
    isTranscribing: transcribeMessage.isPending,
  };
}
