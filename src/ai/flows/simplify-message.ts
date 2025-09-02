'use server';
/**
 * @fileOverview A flow for simplifying a message into plain language.
 *
 * - simplifyMessage - A function that takes a message and returns a simplified version.
 * - SimplifyMessageInput - The input type for the simplifyMessage function.
 * - SimplifyMessageOutput - The return type for the simplifyMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SimplifyMessageInputSchema = z.object({
  content: z.string().describe('The text content of the message to be simplified.'),
});
export type SimplifyMessageInput = z.infer<typeof SimplifyMessageInputSchema>;

const SimplifyMessageOutputSchema = z.object({
  simplifiedContent: z.string().describe('The simplified, plain-language version of the text.'),
});
export type SimplifyMessageOutput = z.infer<typeof SimplifyMessageOutputSchema>;

export async function simplifyMessage(input: SimplifyMessageInput): Promise<SimplifyMessageOutput> {
  return simplifyMessageFlow(input);
}

const simplifyMessagePrompt = ai.definePrompt({
  name: 'simplifyMessagePrompt',
  input: { schema: SimplifyMessageInputSchema },
  output: { schema: SimplifyMessageOutputSchema },
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

**Response Format:** Return only a JSON object with this exact structure:
{"simplifiedContent": "your simplified text here"}
`,
});

const simplifyMessageFlow = ai.defineFlow(
  {
    name: 'simplifyMessageFlow',
    inputSchema: SimplifyMessageInputSchema,
    outputSchema: SimplifyMessageOutputSchema,
  },
  async (input) => {
    const { output } = await simplifyMessagePrompt(input);
    if (!output) {
      throw new Error('Failed to generate simplified message.');
    }
    return output;
  }
);
