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
  targetLanguage: z.string().describe('The language to translate the transcription into (e.g., "Vietnamese", "English").'),
});
export type TranscribeAndTranslateInput = z.infer<typeof _TranscribeAndTranslateInputSchema>;

const _TranscribeAndTranslateOutputSchema = z.object({
  transcription: z.string().describe('The transcribed text from the audio.'),
  translation: z.string().describe('The translated version of the transcription.'),
  model: z.enum(['hybrid-sealion', 'gemini-only']).describe('The AI model combination used.'),
});
export type TranscribeAndTranslateOutput = z.infer<typeof _TranscribeAndTranslateOutputSchema>;


export async function transcribeAndTranslate(
  input: TranscribeAndTranslateInput
): Promise<TranscribeAndTranslateOutput> {
  const { audioDataUri, targetLanguage } = input;
  
  // Step 1: Use Gemini for transcription (multimodal capability)
  const { text: transcription } = await ai.generate({
    model: 'googleai/gemini-2.0-flash',
    prompt: [
      { text: "Transcribe the following audio. Focus on accuracy and include any background context that might be relevant for parent-teacher communication:" },
      { media: { url: audioDataUri } }
    ],
    config: {
      responseModalities: ['TEXT'],
    },
  });

  if (!transcription) {
    throw new Error('Failed to transcribe audio.');
  }

  // Step 2: Use Ollama SEA-LION for translation with Gemini fallback
  try {
    const { seaLionOllama } = await import('@/lib/ollama/sea-lion-client');
    
    const translation = await seaLionOllama.translateMessage(
      transcription,
      targetLanguage
    );
    
    return {
      transcription,
      translation,
      model: 'hybrid-sealion',
    };
  } catch (error) {
    console.warn('Ollama SEA-LION translation failed for voice transcription, falling back to Gemini:', error);
    
    // Fallback to Gemini for translation
    const { output: translationOutput } = await ai.generate({
      prompt: `Translate the following transcribed text into ${targetLanguage}. This is from a voice message in a parent-teacher communication context. Preserve critical details like names, dates, times, and any educational terminology.\n\nText: "${transcription}"`,
      output: {
        format: 'json',
        schema: z.object({ translation: z.string() })
      }
    });
    
    if (!translationOutput) {
      throw new Error('Failed to generate translation with both Sea-Lion and Gemini.');
    }

    return {
      transcription,
      translation: translationOutput.translation,
      model: 'gemini-only',
    };
  }
}
