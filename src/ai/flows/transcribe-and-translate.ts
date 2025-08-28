'use server';
/**
 * @fileOverview A flow for transcribing audio and translating the result.
 *
 * - transcribeAndTranslate - A function that takes audio data and returns a transcription and translation.
 * - TranscribeAndTranslateInput - The input type for the function.
 * - TranscribeAndTranslateOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TranscribeAndTranslateInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "A voice note recording, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  targetLanguage: z.string().describe('The language to translate the transcription into (e.g., "Vietnamese", "English").'),
});
export type TranscribeAndTranslateInput = z.infer<typeof TranscribeAndTranslateInputSchema>;

const TranscribeAndTranslateOutputSchema = z.object({
  transcription: z.string().describe('The transcribed text from the audio.'),
  translation: z.string().describe('The translated version of the transcription.'),
});
export type TranscribeAndTranslateOutput = z.infer<typeof TranscribeAndTranslateOutputSchema>;


export async function transcribeAndTranslate(
  input: TranscribeAndTranslateInput
): Promise<TranscribeAndTranslateOutput> {
  return transcribeAndTranslateFlow(input);
}


const transcribeAndTranslateFlow = ai.defineFlow(
  {
    name: 'transcribeAndTranslateFlow',
    inputSchema: TranscribeAndTranslateInputSchema,
    outputSchema: TranscribeAndTranslateOutputSchema,
  },
  async ({ audioDataUri, targetLanguage }) => {
    const { text: transcription } = await ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: [{ media: { url: audioDataUri } }],
        config: {
            responseModalities: ['TEXT'],
        },
    });

    if (!transcription) {
      throw new Error('Failed to transcribe audio.');
    }

    const { output: translationOutput } = await ai.generate({
      prompt: `Translate the following text into ${targetLanguage}. Preserve critical details like names, dates, and times.
      
      Text: "${transcription}"`,
      output: {
        format: 'json',
        schema: z.object({ translation: z.string() })
      }
    });
    
    if (!translationOutput) {
        throw new Error('Failed to generate translation.');
    }

    return {
        transcription,
        translation: translationOutput.translation,
    };
  }
);
