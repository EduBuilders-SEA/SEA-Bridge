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
    // **PRESERVE EXISTING TRANSLATIONS**: Merge with current translated state
    setTranslatedMessages(prevTranslated => {
      // Create a map of existing translations to preserve them
      const existingTranslations = new Map<string, ChatMessage>();
      prevTranslated.forEach(msg => {
        if (msg.variants?.translatedContent && msg.variants?.translatedLanguage === userLanguage) {
          existingTranslations.set(msg.id, msg);
        }
      });

      // Merge incoming messages with preserved translations
      return messages.map(message => {
        const existing = existingTranslations.get(message.id);
        if (existing?.variants?.translatedContent) {
          // **PRESERVE**: Keep existing translation, but update other fields (like content for edits)
          return {
            ...message, // Use updated message content (in case of edits)
            variants: {
              ...message.variants,
              ...existing.variants, // Preserve translation data
            }
          };
        }
        return message;
      });
    });

    // Find messages needing translation (exclude those already translated in current language)
    const messagesToTranslate = messages
      .filter((message) => {
        const key = `${message.id}-${userLanguage}`;
        const alreadyTranslated = message.variants?.translatedContent && 
                                 message.variants?.translatedLanguage === userLanguage;
        
        return (
          !processedRef.current.has(key) &&
          !alreadyTranslated && // **KEY FIX**: Don't re-translate existing translations
          message.sender_id !== currentUserId &&
          message.message_type === 'text'
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
