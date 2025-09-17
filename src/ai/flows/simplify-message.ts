'use server';
/**
 * @fileOverview A hybrid flow for simplifying messages using Sea-Lion (primary) with Gemini fallback.
 *
 * - simplifyMessage - A function that takes a message and returns a simplified version.
 * - SimplifyMessageInput - The input type for the simplifyMessage function.
 * - SimplifyMessageOutput - The return type for the simplifyMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const _SimplifyMessageInputSchema = z.object({
  content: z.string().describe('The text content of the message to be simplified.'),
  language: z.string().optional().describe('The language of the message (optional, defaults to English).'),
});
export type SimplifyMessageInput = z.infer<typeof _SimplifyMessageInputSchema>;

const _SimplifyMessageOutputSchema = z.object({
  simplifiedContent: z.string().describe('The simplified, plain-language version of the text.'),
  model: z.enum(['sea-lion', 'gemini']).describe('The AI model used for simplification.'),
});
export type SimplifyMessageOutput = z.infer<typeof _SimplifyMessageOutputSchema>;

export async function simplifyMessage(input: SimplifyMessageInput): Promise<SimplifyMessageOutput> {
  const language = input.language ?? 'English';
  
  // Try Ollama SEA-LION first (FAST!)
  try {
    const { seaLionOllama } = await import('@/lib/ollama/sea-lion-client');
    
    const simplifiedContent = await seaLionOllama.simplifyMessage(input.content, language);
    return {
      simplifiedContent,
      model: 'sea-lion',
    };
  } catch (error) {
    console.warn('Ollama SEA-LION simplification failed, falling back to Gemini:', error);
    
    // Fallback to Gemini
    try {
      const { simplifiedContent } = await simplifyMessageFallback({ content: input.content });
      return {
        simplifiedContent,
        model: 'gemini',
      };
    } catch (fallbackError) {
      console.error('All simplification failed:', fallbackError);
      throw new Error('Simplification unavailable');
    }
  }
}

// Gemini fallback for message simplification
const simplifyMessagePrompt = ai.definePrompt({
  name: 'simplifyMessagePrompt',
  input: { 
    schema: z.object({
      content: z.string(),
    })
  },
  output: { 
    schema: z.object({
      simplifiedContent: z.string(),
    })
  },
  prompt: `You are an expert in communication and accessibility. Your task is to rewrite the given message into simple, plain language that is easy for someone with low literacy to understand.

**Guidelines:**
- Use short, simple sentences.
- Avoid jargon, complex words, and idiomatic expressions.
- Break down complex ideas into smaller, more manageable points.
- Focus on the key information and required actions.
- Preserve all critical information like dates, times, names, and amounts.

Original Message:
"{{content}}"

Rewrite the above message into simple, plain language.
`,
});

const simplifyMessageFallback = ai.defineFlow(
  {
    name: 'simplifyMessageFallback',
    inputSchema: z.object({
      content: z.string(),
    }),
    outputSchema: z.object({
      simplifiedContent: z.string(),
    }),
  },
  async (input) => {
    const { output } = await simplifyMessagePrompt(input);
    if (!output) {
      throw new Error('Failed to generate simplified message with Gemini fallback.');
    }
    return output;
  }
);
