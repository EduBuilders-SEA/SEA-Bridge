'use server';

import { transcribeAndTranslate } from '@/ai/flows/transcribe-and-translate';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface SendVoiceMessageInput {
  contactLinkId: string;
  audioDataUri: string;
  targetLanguage: string;
  accessToken: string;
}

export interface VoiceMessageResult {
  success: boolean;
  message?: {
    file_url: string | null;
    id: string;
    content: string;
    message_type: string;
    variants: Record<string, unknown>;
    contact_link_id: string;
    sender_id: string;
    sent_at: string;
  };
  error?: string;
}

export async function sendVoiceMessage(
  input: SendVoiceMessageInput
): Promise<VoiceMessageResult> {
  try {
    const { contactLinkId, audioDataUri, targetLanguage, accessToken } = input;
    const supabase = await createClient(accessToken);

    // Extract user ID from Firebase token (accessToken)
    // The createClient function handles Firebase token verification
    // We can get the user ID from the JWT payload
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString()
    );
    const userId = payload.sub;

    if (!userId) {
      return { success: false, error: 'Invalid access token' };
    }

    // Create initial message with transcribing status
    const initialMessage = {
      contact_link_id: contactLinkId,
      sender_id: userId,
      content: 'Voice note',
      message_type: 'voice' as const,
      variants: {
        audioDataUri,
        isTranscribing: true,
        originalLanguage: 'auto', // Will be detected during transcription
        translatedLanguage: targetLanguage,
      },
    };

    const { data: message, error: insertError } = await supabase
      .from('messages')
      .insert(initialMessage)
      .select()
      .single();

    if (insertError ?? !message) {
      console.error('Failed to insert message:', insertError);
      return { success: false, error: 'Failed to create message' };
    }

    // Note: Broadcasting is handled by the client using the singleton channel
    // Server actions can't reliably broadcast to existing realtime connections

    // Start transcription and translation in background
    transcribeAndTranslateVoiceMessage(
      message.id,
      audioDataUri,
      targetLanguage,
      accessToken
    ).catch((error) => {
      console.error('Background transcription failed:', error);
    });

    revalidatePath('/[role]/chat/[id]', 'page');
    return { success: true, message };
  } catch (error) {
    console.error('Error sending voice message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function transcribeAndTranslateVoiceMessage(
  messageId: string,
  audioDataUri: string,
  targetLanguage: string,
  accessToken: string
) {
  try {
    const supabase = await createClient(accessToken);

    // Perform transcription and translation
    const result = await transcribeAndTranslate({
      audioDataUri,
      targetLanguage,
    });

    // Update message with results
    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({
        content: result.transcription, // Use transcription as main content
        variants: {
          audioDataUri,
          transcription: result.transcription,
          translatedContent: result.translation,
          originalLanguage: 'auto', // Could be enhanced to detect actual language
          translatedLanguage: targetLanguage,
          isTranscribing: false,
          translationModel: 'gemini', // Based on your transcribeAndTranslate flow
        },
      })
      .eq('id', messageId)
      .select()
      .single();

    if (updateError || !updatedMessage) {
      console.error('Failed to update voice message:', updateError);
      // Update with error status
      await supabase
        .from('messages')
        .update({
          content: 'Failed to process voice note',
          variants: {
            audioDataUri,
            isTranscribing: false,
            error: 'Transcription failed',
          },
        })
        .eq('id', messageId);
    } else {
      // Note: Transcription update broadcasting is handled by the client via realtime subscriptions
      // Server actions should focus on data updates, not realtime broadcasting
    }
  } catch (error) {
    console.error('Transcription error:', error);

    // Update message with error status
    const supabase = await createClient(accessToken);
    const { data: errorMessage } = await supabase
      .from('messages')
      .update({
        content: 'Failed to process voice note',
        variants: {
          audioDataUri,
          isTranscribing: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      })
      .eq('id', messageId)
      .select()
      .single();

    // Broadcast the error update
    if (errorMessage) {
      try {
        const { data: messageData } = await supabase
          .from('messages')
          .select('contact_link_id')
          .eq('id', messageId)
          .single();

        if (messageData) {
          const channelName = `messages:${messageData.contact_link_id}`;
          const channel = supabase.channel(channelName);

          await channel.send({
            type: 'broadcast',
            event: 'message_edit',
            payload: {
              messageId: errorMessage.id,
              content: errorMessage.content,
              editedBy: 'system',
              editedAt: new Date().toISOString(),
            },
          });

          console.warn(
            '📤 Voice transcription error broadcast sent:',
            messageId
          );
        }
      } catch (broadcastError) {
        console.warn(
          '⚠️ Failed to broadcast transcription error:',
          broadcastError
        );
      }
    }
  }
}
