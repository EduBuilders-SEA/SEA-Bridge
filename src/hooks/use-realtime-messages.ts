'use client';

import {
  ChatMessageSchema,
  SendMessageSchema,
  type ChatMessage,
  type SendMessageData,
} from '@/lib/schemas';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './use-auth';
import { useNotificationSound } from './use-notification-sound';

const EVENT_MESSAGE_TYPE = 'message';
const EVENT_MESSAGE_EDIT = 'message_edit';
const EVENT_MESSAGE_DELETE = 'message_delete';
const EVENT_FILE_UPLOAD_START = 'file_upload_start';
const EVENT_FILE_UPLOAD_COMPLETE = 'file_upload_complete';
const EVENT_TRANSLATION_START = 'translation_start';
const EVENT_TRANSLATION_COMPLETE = 'translation_complete';

export function useRealtimeMessages(contactLinkId: string) {
  const { user } = useAuth();
  const { playNotificationSound } = useNotificationSound();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channel, setChannel] = useState<ReturnType<
    typeof supabase.channel
  > | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

  const sendMessage = useCallback(
    async (messageData: Omit<SendMessageData, 'contact_link_id'>) => {
      // ✅ DRY: Validate input with Zod
      const validatedData = SendMessageSchema.omit({
        contact_link_id: true,
      }).parse(messageData);

      if (!user?.uid || !channel || !isConnected) {
        console.warn(
          'Cannot send message: user, channel, or connection missing'
        );
        return null;
      }

      // ✅ DRY: Create message with Zod schema
      const message = ChatMessageSchema.parse({
        id: crypto.randomUUID(),
        content: validatedData.content,
        message_type: validatedData.message_type,
        contact_link_id: contactLinkId,
        sender_id: user.uid,
        sent_at: new Date().toISOString(),
        variants: validatedData.variants,
        file_url: validatedData.file_url,
        user: {
          id: user.uid,
          name: user.displayName ?? user.email ?? 'You',
        },
      });

      setMessages((current) => [...current, message]);

      await channel.send({
        type: 'broadcast',
        event: EVENT_MESSAGE_TYPE,
        payload: message,
      });

      console.log('📤 Message broadcast:', message.id);
      return message;
    },
    [user, channel, isConnected, contactLinkId]
  );

  // Broadcast helpers for document translation
  const broadcastFileUploadStart = useCallback(
    async (fileName: string) => {
      if (!channel || !isConnected || !user?.uid) return;

      await channel.send({
        type: 'broadcast',
        event: EVENT_FILE_UPLOAD_START,
        payload: {
          fileName,
          uploadedBy: user.uid,
        },
      });
    },
    [channel, isConnected, user?.uid]
  );

  const broadcastFileUploadComplete = useCallback(
    async (messageId: string, fileName: string) => {
      if (!channel || !isConnected || !user?.uid) return;

      await channel.send({
        type: 'broadcast',
        event: EVENT_FILE_UPLOAD_COMPLETE,
        payload: {
          messageId,
          fileName,
          uploadedBy: user.uid,
        },
      });
    },
    [channel, isConnected, user?.uid]
  );

  const broadcastTranslationStart = useCallback(
    async (messageId: string, targetLanguage: string) => {
      if (!channel || !isConnected || !user?.uid) return;

      await channel.send({
        type: 'broadcast',
        event: EVENT_TRANSLATION_START,
        payload: {
          messageId,
          targetLanguage,
          initiatedBy: user.uid,
        },
      });
    },
    [channel, isConnected, user?.uid]
  );

  const broadcastTranslationComplete = useCallback(
    async (
      messageId: string,
      targetLanguage: string,
      translatedContent: string,
      processingTime?: number
    ) => {
      if (!channel || !isConnected || !user?.uid) return;

      await channel.send({
        type: 'broadcast',
        event: EVENT_TRANSLATION_COMPLETE,
        payload: {
          messageId,
          targetLanguage,
          translatedContent,
          processingTime,
        },
      });
    },
    [channel, isConnected, user?.uid]
  );

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.uid || !contactLinkId) {
      console.warn(
        '❌ Real-time subscription not created - missing user or contactLinkId'
      );
      return;
    }

    const channelName = `messages:${contactLinkId}`;
    // Creating real-time channel

    const newChannel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: true }, // Don't receive your own messages
        },
      })
      // Listen for new messages
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, async (payload) => {
        // ✅ DRY: Validate incoming message with Zod
        const message = ChatMessageSchema.parse(payload.payload);
        console.log('📥 Real-time message received:', message.id);

        // Note: Auto-translation is now handled by useAutoTranslation hook
        // This provides better caching, batching, and user preference management

        setMessages((current) => {
          const exists = current.some((m) => m.id === message.id);
          if (exists) return current;

          // 🔊 Play notification sound for new messages from others
          if (message.sender_id !== user?.uid) {
            playNotificationSound();

            // ✨ Add visual indicator for new messages
            setNewMessageIds((prev) => new Set(prev.add(message.id)));

            // Remove the new message indicator after animation completes
            setTimeout(() => {
              setNewMessageIds((prev) => {
                const updated = new Set(prev);
                updated.delete(message.id);
                return updated;
              });
            }, 1500);
          }

          return [...current, message].sort(
            (a, b) =>
              new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
          );
        });
      })
      // Listen for message edits
      .on('broadcast', { event: EVENT_MESSAGE_EDIT }, (payload) => {
        const { messageId, content } = payload.payload as {
          messageId: string;
          content: string;
          editedBy: string;
          editedAt: string;
        };

        console.log('✏️ Real-time edit received:', messageId);

        setMessages((current) => {
          return current.map((msg) =>
            msg.id === messageId ? { ...msg, content } : msg
          );
        });
      })
      // Listen for message deletions
      .on('broadcast', { event: EVENT_MESSAGE_DELETE }, (payload) => {
        const { messageId } = payload.payload as {
          messageId: string;
          deletedBy: string;
          deletedAt: string;
        };

        console.log('🗑️ Real-time delete received:', messageId);

        setMessages((current) => {
          return current.filter((msg) => msg.id !== messageId);
        });
      })
      // Listen for file upload status updates
      .on('broadcast', { event: EVENT_FILE_UPLOAD_START }, (payload) => {
        const { fileName, uploadedBy } = payload.payload as {
          fileName: string;
          uploadedBy: string;
        };

        console.log('📎 File upload started:', fileName);

        // Could add UI indicator here (e.g., show uploading state)
        // This is useful for showing real-time upload progress to other users
      })
      .on('broadcast', { event: EVENT_FILE_UPLOAD_COMPLETE }, (payload) => {
        const { messageId, fileName, uploadedBy } = payload.payload as {
          messageId: string;
          fileName: string;
          uploadedBy: string;
        };

        console.log('📎 File upload completed:', fileName);

        // Refresh messages to show the new file message
        // This ensures all users see the file immediately after upload
      })
      // Listen for translation status updates
      .on('broadcast', { event: EVENT_TRANSLATION_START }, (payload) => {
        const { messageId, targetLanguage, initiatedBy } = payload.payload as {
          messageId: string;
          targetLanguage: string;
          initiatedBy: string;
        };

        console.log(
          '🌍 Translation started for:',
          messageId,
          'to',
          targetLanguage
        );

        // Update message to show translation in progress
        setMessages((current) => {
          return current.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  variants: {
                    ...msg.variants,
                    [`translating_${targetLanguage}`]: true,
                  },
                }
              : msg
          );
        });
      })
      .on('broadcast', { event: EVENT_TRANSLATION_COMPLETE }, (payload) => {
        const { messageId, targetLanguage, translatedContent, processingTime } =
          payload.payload as {
            messageId: string;
            targetLanguage: string;
            translatedContent: string;
            processingTime?: number;
          };

        console.log(
          '🌍 Translation completed for:',
          messageId,
          'to',
          targetLanguage
        );

        // Update message with completed translation
        setMessages((current) => {
          return current.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  variants: {
                    ...msg.variants,
                    [`translated_${targetLanguage}`]: translatedContent,
                    [`translating_${targetLanguage}`]: false,
                    [`translation_time_${targetLanguage}`]: processingTime,
                  },
                }
              : msg
          );
        });
      })
      .subscribe((status) => {
        // Channel status updated
        setIsConnected(status === 'SUBSCRIBED');
      });

    setChannel(newChannel);

    return () => {
      // Cleaning up channel
      supabase.removeChannel(newChannel);
      setChannel(null);
      setIsConnected(false);
    };
  }, [user?.uid, contactLinkId, supabase]);

  return {
    messages,
    sendMessage,
    isConnected,
    channel,
    newMessageIds,
    // Document translation broadcast helpers
    broadcastFileUploadStart,
    broadcastFileUploadComplete,
    broadcastTranslationStart,
    broadcastTranslationComplete,
  };
}
