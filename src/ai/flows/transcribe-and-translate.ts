'use server';
/**
 * @fileOverview A hybrid flow for transcribing audio (Gemini) and translating (Sea-Lion primary, Gemini fallback).
 *
 * - transcribeAndTranslate - A function that takes audio data and returns a transcription and translation.
 * - TranscribeAndTranslateInput - The input type for the function.
 * - TranscribeAndTranslateOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const _TranscribeAndTranslateInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A voice note recording, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  targetLanguage: z
    .string()
    .describe(
      'The language to translate the transcription into (e.g., "Vietnamese", "English").'
    ),
});
export type TranscribeAndTranslateInput = z.infer<
  typeof _TranscribeAndTranslateInputSchema
>;

const _TranscribeAndTranslateOutputSchema = z.object({
  transcription: z.string().describe('The transcribed text from the audio.'),
  translation: z
    .string()
    .describe('The translated version of the transcription.'),
  detectedLanguage: z
    .string()
    .describe('The detected source language of the audio.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('Confidence score of the transcription (0-1).'),
  model: z
    .enum(['hybrid-sealion', 'gemini-only'])
    .describe('The AI model combination used.'),
});
export type TranscribeAndTranslateOutput = z.infer<
  typeof _TranscribeAndTranslateOutputSchema
>;

export async function transcribeAndTranslate(
  input: TranscribeAndTranslateInput
): Promise<TranscribeAndTranslateOutput> {
  const { audioDataUri, targetLanguage } = input;

  console.warn('🎙️ Transcribe & Translate Debug:', {
    targetLanguage,
    audioDataUriLength: audioDataUri.length,
  });

  // Step 1: Use Gemini for transcription with enhanced prompt
  const transcriptionResult = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: [
      {
        text: `Transcribe the following audio recording accurately. Focus on:
- Exact words spoken (preserve names, dates, numbers)
- Natural speech patterns and pauses
- Context clues for unclear words
- Detect the source language

Respond with JSON containing:
- transcription: the exact transcribed text
- detectedLanguage: the detected source language
- confidence: your confidence in the transcription (0.0 to 1.0)

Audio to transcribe:`,
      },
      { media: { url: audioDataUri } },
    ],
    output: {
      format: 'json',
      schema: z.object({
        transcription: z.string(),
        detectedLanguage: z.string(),
        confidence: z.number().min(0).max(1),
      }),
    },
    config: {
      responseModalities: ['TEXT'],
      temperature: 0.1, // Low temperature for accuracy
    },
  });

  if (!transcriptionResult.output) {
    throw new Error('Failed to transcribe audio - no output returned');
  }

  const { transcription, detectedLanguage, confidence } =
    transcriptionResult.output;

  console.warn('🎙️ Transcription Result:', {
    transcription,
    detectedLanguage,
    targetLanguage,
    confidence,
  });

  // Step 2: Skip translation only if target language matches detected language
  // Compare languages in a case-insensitive way and handle common variations
  const normalizeLanguage = (lang: string) => {
    const normalized = lang.toLowerCase().trim();
    // Handle common language variations
    if (normalized.includes('english') || normalized === 'en') return 'english';
    if (
      normalized.includes('tagalog') ||
      normalized.includes('filipino') ||
      normalized === 'tl'
    )
      return 'tagalog';
    if (normalized.includes('spanish') || normalized === 'es') return 'spanish';
    if (
      normalized.includes('chinese') ||
      normalized.includes('mandarin') ||
      normalized.includes('中文') ||
      normalized === 'zh'
    )
      return 'chinese';
    if (
      normalized.includes('malay') ||
      normalized.includes('bahasa melayu') ||
      normalized === 'ms'
    )
      return 'malay';
    if (
      normalized.includes('tamil') ||
      normalized.includes('தமிழ்') ||
      normalized === 'ta'
    )
      return 'tamil';
    if (
      normalized.includes('vietnamese') ||
      normalized.includes('tiếng việt') ||
      normalized === 'vi'
    )
      return 'vietnamese';
    if (
      normalized.includes('thai') ||
      normalized.includes('ไทย') ||
      normalized === 'th'
    )
      return 'thai';
    if (
      normalized.includes('myanmar') ||
      normalized.includes('burmese') ||
      normalized.includes('မြန်မာဘာသာ') ||
      normalized === 'my'
    )
      return 'myanmar';
    if (
      normalized.includes('khmer') ||
      normalized.includes('cambodian') ||
      normalized.includes('ខ្មែរ') ||
      normalized === 'km'
    )
      return 'khmer';
    if (
      normalized.includes('lao') ||
      normalized.includes('laotian') ||
      normalized.includes('ລາວ') ||
      normalized === 'lo'
    )
      return 'lao';
    if (
      normalized.includes('indonesian') ||
      normalized.includes('bahasa indonesia') ||
      normalized === 'id'
    )
      return 'indonesian';
    // Add more mappings as needed
    return normalized;
  };

  const normalizedTarget = normalizeLanguage(targetLanguage);
  const normalizedDetected = normalizeLanguage(detectedLanguage);

  console.warn('🌍 Language Normalization:', {
    originalTarget: targetLanguage,
    originalDetected: detectedLanguage,
    normalizedTarget,
    normalizedDetected,
    shouldSkipTranslation: normalizedTarget === normalizedDetected,
  });

  if (normalizedTarget === normalizedDetected) {
    return {
      transcription,
      translation: transcription, // Same as transcription since no translation needed
      detectedLanguage,
      confidence,
      model: 'hybrid-sealion',
    };
  }

  // Step 3: Use Ollama SEA-LION for translation with Gemini fallback
  try {
    const { seaLionOllama } = await import('@/lib/ollama/sea-lion-client');

    const translation = await seaLionOllama.translateMessage(
      transcription,
      targetLanguage
    );

    return {
      transcription,
      translation,
      detectedLanguage,
      confidence,
      model: 'hybrid-sealion',
    };
  } catch (error) {
    console.warn(
      'Ollama SEA-LION translation failed for voice transcription, falling back to Gemini:',
      error
    );

    // Fallback to Gemini for translation with enhanced prompt
    const translationResult = await ai.generate({
      prompt: `You are a professional translator specializing in Southeast Asian languages for parent-teacher communication.

Task: Translate the following text to ${targetLanguage} while preserving all critical information.

CRITICAL REQUIREMENTS:
- Preserve ALL proper nouns (names, places, school subjects)
- Preserve ALL numbers, dates, and times exactly  
- Preserve ALL specific details (grades, assignments, events)
- Use natural, respectful tone appropriate for parent-teacher communication
- If text is already in target language, return it unchanged

Text to translate: "${transcription}"

Respond with JSON containing:
- translation: the translated text preserving all critical details
- confidence: your confidence in the translation (0.0 to 1.0)`,

      output: {
        format: 'json',
        schema: z.object({
          translation: z
            .string()
            .describe('The translated text preserving all critical details'),
          confidence: z
            .number()
            .min(0)
            .max(1)
            .describe('Translation confidence score'),
        }),
      },
      config: {
        temperature: 0.2, // Low temperature for consistency
      },
    });

    if (!translationResult.output) {
      throw new Error('Failed to generate translation with Gemini.');
    }

    return {
      transcription,
      translation: translationResult.output.translation,
      detectedLanguage,
      confidence: Math.min(confidence, translationResult.output.confidence), // Take minimum confidence
      model: 'gemini-only',
    };
  }
}
