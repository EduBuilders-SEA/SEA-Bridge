'use server';
/**
 * @fileOverview A hybrid flow for splitting messages into SMS chunks using Sea-Lion (primary) with Gemini fallback.
 *
 * - chunkMessageForSms - A function that takes a message and returns it as an array of smaller chunks.
 * - ChunkMessageForSmsInput - The input type for the function.
 * - ChunkMessageForSmsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const _ChunkMessageForSmsInputSchema = z.object({
  content: z.string().describe('The text content of the message to be split.'),
  language: z.string().optional().describe('The language of the message (optional, defaults to English).'),
});
export type ChunkMessageForSmsInput = z.infer<typeof _ChunkMessageForSmsInputSchema>;

const _ChunkMessageForSmsOutputSchema = z.object({
  chunks: z
    .array(z.string())
    .describe('An array of message chunks, where each chunk is 160 characters or less.'),
  model: z.enum(['sea-lion', 'gemini']).describe('The AI model used for chunking.'),
});
export type ChunkMessageForSmsOutput = z.infer<typeof _ChunkMessageForSmsOutputSchema>;

export async function chunkMessageForSms(input: ChunkMessageForSmsInput): Promise<ChunkMessageForSmsOutput> {
  const language = input.language ?? 'English';
  
  // Try Ollama SEA-LION first for better Southeast Asian language handling
  try {
    const { seaLionOllama } = await import('@/lib/ollama/sea-lion-client');
    
    const chunks = await seaLionOllama.smartChunkForSMS(input.content, language);
    return {
      chunks,
      model: 'sea-lion',
    };
  } catch (error) {
    console.warn('Ollama SEA-LION SMS chunking failed, falling back to Gemini:', error);
    
    // Fallback to Gemini
    try {
      const { chunks } = await chunkMessageForSmsFallback({ content: input.content });
      return {
        chunks,
        model: 'gemini',
      };
    } catch (fallbackError) {
      console.error('Both Sea-Lion and Gemini SMS chunking failed:', fallbackError);
      throw new Error('SMS chunking service unavailable. Please try again later.');
    }
  }
}

// Gemini fallback for SMS chunking
const chunkMessageForSmsPrompt = ai.definePrompt({
  name: 'chunkMessageForSmsPrompt',
  input: { 
    schema: z.object({
      content: z.string(),
    })
  },
  output: { 
    schema: z.object({
      chunks: z.array(z.string()),
    })
  },
  prompt: `You are an expert at preparing messages for SMS delivery. Your task is to split a given message into one or more chunks.

**Rules:**
1.  Each chunk MUST be 160 characters or less.
2.  If the message is split into more than one chunk, you MUST prefix each chunk with a part number, like "(1/3)", "(2/3)", etc.
3.  If the message fits within a single chunk, do NOT add a part number.
4.  Do not lose any information from the original message.

Original Message:
"{{content}}"

Split the above message into SMS chunks.
`,
});

const chunkMessageForSmsFallback = ai.defineFlow(
  {
    name: 'chunkMessageForSmsFallback',
    inputSchema: z.object({
      content: z.string(),
    }),
    outputSchema: z.object({
      chunks: z.array(z.string()),
    }),
  },
  async (input) => {
    const { output } = await chunkMessageForSmsPrompt(input);
    if (!output) {
      throw new Error('Failed to generate SMS chunks with Gemini fallback.');
    }
    return output;
  }
);
