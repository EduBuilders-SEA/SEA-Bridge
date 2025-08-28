'use server';
/**
 * @fileOverview A flow for splitting a long message into SMS-compliant chunks.
 *
 * - chunkMessageForSms - A function that takes a message and returns it as an array of smaller chunks.
 * - ChunkMessageForSmsInput - The input type for the function.
 * - ChunkMessageForSmsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ChunkMessageForSmsInputSchema = z.object({
  content: z.string().describe('The text content of the message to be split.'),
});
export type ChunkMessageForSmsInput = z.infer<typeof ChunkMessageForSmsInputSchema>;

const ChunkMessageForSmsOutputSchema = z.object({
  chunks: z
    .array(z.string())
    .describe('An array of message chunks, where each chunk is 160 characters or less.'),
});
export type ChunkMessageForSmsOutput = z.infer<typeof ChunkMessageForSmsOutputSchema>;

export async function chunkMessageForSms(input: ChunkMessageForSmsInput): Promise<ChunkMessageForSmsOutput> {
  return chunkMessageForSmsFlow(input);
}

const chunkMessageForSmsPrompt = ai.definePrompt({
  name: 'chunkMessageForSmsPrompt',
  input: { schema: ChunkMessageForSmsInputSchema },
  output: { schema: ChunkMessageForSmsOutputSchema },
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

const chunkMessageForSmsFlow = ai.defineFlow(
  {
    name: 'chunkMessageForSmsFlow',
    inputSchema: ChunkMessageForSmsInputSchema,
    outputSchema: ChunkMessageForSmsOutputSchema,
  },
  async (input) => {
    const { output } = await chunkMessageForSmsPrompt(input);
    if (!output) {
      throw new Error('Failed to generate SMS chunks.');
    }
    return output;
  }
);
