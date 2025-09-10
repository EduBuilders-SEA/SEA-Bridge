'use client';

import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './use-auth';
import { SendMessageSchema, ChatMessageSchema, type ChatMessage, type SendMessageData } from '@/lib/schemas';

const EVENT_MESSAGE_TYPE = 'message';

export function useRealtimeMessages(contactLinkId: string) {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [channel, setChannel] = useState<ReturnType<
    typeof supabase.channel
  > | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const sendMessage = useCallback(
    async (messageData: Omit<SendMessageData, 'contact_link_id'>) => {
      // ✅ DRY: Validate input with Zod
      const validatedData = SendMessageSchema.omit({ contact_link_id: true }).parse(messageData);
      
      if (!user?.uid || !channel || !isConnected) {
        console.warn('Cannot send message: user, channel, or connection missing');
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
          broadcast: { self: false }, // Don't receive your own messages
        },
      })
      .on('broadcast', { event: EVENT_MESSAGE_TYPE }, (payload) => {
        // ✅ DRY: Validate incoming message with Zod
        const message = ChatMessageSchema.parse(payload.payload);
        console.log('📥 Real-time message received:', message.id);

        setMessages((current) => {
          const exists = current.some((m) => m.id === message.id);
          if (exists) return current;

          return [...current, message].sort(
            (a, b) =>
              new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime() 
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
  };
}
