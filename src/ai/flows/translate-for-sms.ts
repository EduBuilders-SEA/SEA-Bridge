'use server';
/**
 * @fileOverview A Sea-Lion specialized flow for translating and chunking messages for SMS delivery.
 *
 * - translateForSMS - A function that translates and chunks a message for SMS delivery.
 * - TranslateForSMSInput - The input type for the function.
 * - TranslateForSMSOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const _TranslateForSMSInputSchema = z.object({
  content: z.string().describe('The text content to translate for SMS.'),
  targetLanguage: z.string().describe('The target language for translation.'),
  simplify: z
    .boolean()
    .optional()
    .describe('Whether to also simplify the message (optional).'),
});
export type TranslateForSMSInput = z.infer<typeof _TranslateForSMSInputSchema>;

const _TranslateForSMSOutputSchema = z.object({
  translatedContent: z.string().describe('The translated text.'),
  simplifiedContent: z
    .string()
    .optional()
    .describe('The simplified version if requested.'),
  model: z
    .enum(['sea-lion', 'gemini'])
    .describe('The AI model used for translation.'),
});
export type TranslateForSMSOutput = z.infer<
  typeof _TranslateForSMSOutputSchema
>;

export async function translateForSMS(
  input: TranslateForSMSInput
): Promise<TranslateForSMSOutput> {
  // Use Ollama SEA-LION for both translation and SMS chunking
  try {
    const { seaLionOllama } = await import('@/lib/ollama/sea-lion-client');

    const translation = await seaLionOllama.translateMessage(
      input.content,
      input.targetLanguage,
      input.sourceLanguage
    );

    const chunks = await seaLionOllama.smartChunkForSMS(
      translation,
      input.targetLanguage
    );

    return {
      translation,
      chunks,
      model: 'sea-lion',
      chunkCount: chunks.length,
    };
  } catch (error) {
    console.warn(
      'Ollama SEA-LION SMS translation failed, falling back to Gemini:',
      error
    );

    // Fallback to Gemini
    try {
      const { translation } = await translateForSMSFallback({
        content: input.content,
        targetLanguage: input.targetLanguage,
      });

      // Simple chunking fallback
      const chunks = simpleChunkForSMS(translation);

      return {
        translation,
        chunks,
        model: 'gemini',
        chunkCount: chunks.length,
      };
    } catch (fallbackError) {
      console.error(
        'Both Sea-Lion and Gemini SMS translation failed:',
        fallbackError
      );
      throw new Error(
        'SMS translation service unavailable. Please try again later.'
      );
    }
  }
}

// Simple chunking fallback when Sea-Lion fails
function simpleChunkForSMS(content: string, maxLength: number = 160): string[] {
  if (content.length <= maxLength) return [content];

  const chunks: string[] = [];
  const words = content.split(' ');
  let current = '';

  for (const word of words) {
    const testLength = current ? `${current} ${word}`.length : word.length;

    if (testLength > maxLength - 10) {
      // Reserve space for (n/m)
      if (current) {
        chunks.push(current.trim());
        current = word;
      } else {
        // Single word is too long, force break
        chunks.push(word.substring(0, maxLength - 10));
        current = word.substring(maxLength - 10);
      }
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }

  if (current) chunks.push(current.trim());

  // Add numbering if multiple chunks
  if (chunks.length > 1) {
    return chunks.map((chunk, i) => `(${i + 1}/${chunks.length}) ${chunk}`);
  }

  return chunks;
}

// Gemini fallback flow
const translateForSMSFallback = ai.defineFlow(
  {
    name: 'translateForSMSFallback',
    inputSchema: z.object({
      content: z.string(),
      targetLanguage: z.string(),
    }),
    outputSchema: z.object({
      translation: z.string(),
    }),
  },
  async ({ content, targetLanguage }) => {
    const { output } = await ai.generate({
      prompt: `Translate this message for SMS delivery in ${targetLanguage}. Keep it concise while preserving all important details like names, dates, times, and amounts.

Original message:
"${content}"

Translation:`,
      output: {
        format: 'json',
        schema: z.object({ translation: z.string() }),
      },
    });

    if (!output) {
      throw new Error(
        'Failed to generate SMS translation with Gemini fallback.'
      );
    }

    return output;
  }
);
