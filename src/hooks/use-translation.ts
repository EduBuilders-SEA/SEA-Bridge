'use client';

import { translateMessage } from '@/ai/flows/translate-message';
import type { ChatMessage } from '@/lib/schemas';
import { useEffect, useRef, useState } from 'react';
import { useCurrentProfile } from './use-profile';

interface TranslationResult {
  id: string;
  translation: string;
  model: 'sea-lion' | 'gemini';
}

export function useFastAutoTranslation(
  messages: ChatMessage[],
  currentUserId: string,  
  selectedLanguage: string
) {
  const { data: profile } = useCurrentProfile();
  const [translatedMessages, setTranslatedMessages] =
    useState<ChatMessage[]>(messages);
  const [isTranslating, setIsTranslating] = useState<Set<string>>(new Set());

  const processedRef = useRef<Set<string>>(new Set());
  const translationCacheRef = useRef<Map<string, TranslationResult>>(new Map());

  const userLanguage = selectedLanguage || profile?.preferred_language || 'English';

  useEffect(() => {
    // **IMMEDIATE RESPONSE**: Show messages instantly
    setTranslatedMessages(messages);

    // Find messages needing translation
    const messagesToTranslate = messages
      .filter((message) => {
        const key = `${message.id}-${userLanguage}`;
        return (
          !processedRef.current.has(key) &&
          message.sender_id !== currentUserId &&
          message.message_type === 'text' &&
          message.variants?.translatedLanguage !== userLanguage
        );
      })
      // **NEWEST FIRST**: Sort by timestamp descending
      .sort(
        (a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
      );

    if (messagesToTranslate.length === 0) return;

    // Mark as processing immediately
    messagesToTranslate.forEach((message) => {
      const key = `${message.id}-${userLanguage}`;
      processedRef.current.add(key);
    });

    // **PROGRESSIVE TRANSLATION**: Translate one by one, newest first
    messagesToTranslate.forEach((message, index) => {
      // Stagger requests to avoid overwhelming Ollama
      setTimeout(() => {
        translateSingleMessage(message);
      }, index * 100); // 100ms delay between each
    });
  }, [messages, userLanguage, currentUserId]);

  const translateSingleMessage = async (message: ChatMessage) => {
    // Mark as translating
    setIsTranslating((prev) => new Set(prev).add(message.id));

    try {
      const result = await translateMessage({
        content: message.content,
        targetLanguage: userLanguage,
        sourceLanguage: 'Unknown',
      });

      const translationResult: TranslationResult = {
        id: message.id,
        translation: result.translatedContent,
        model: result.model,
      };

      // Cache result
      const cacheKey = `${message.id}-${userLanguage}`;
      translationCacheRef.current.set(cacheKey, translationResult);

      // **IMMEDIATE UI UPDATE**: Update just this message
      setTranslatedMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === message.id
            ? {
                ...msg,
                variants: {
                  ...msg.variants,
                  translatedContent: result.translatedContent,
                  translatedLanguage: userLanguage,
                  translationModel: result.model,
                  translationTimestamp: new Date().toISOString(),
                },
              }
            : msg
        )
      );
    } catch (error) {
      console.error(`Translation failed for ${message.id}:`, error);
    } finally {
      // Remove translating status
      setIsTranslating((prev) => {
        const newSet = new Set(prev);
        newSet.delete(message.id);
        return newSet;
      });
    }
  };

  return {
    messages: translatedMessages,
    isTranslating,
    userLanguage,
  };
}
