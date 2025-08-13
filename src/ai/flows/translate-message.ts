'use server';

/**
 * @fileOverview Translates messages from teachers to parents in their preferred language.
 *
 * - translateMessage - A function that translates the input message.
 * - TranslateMessageInput - The input type for the translateMessage function.
 * - TranslateMessageOutput - The return type for the translateMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateMessageInputSchema = z.object({
  message: z.string().describe('The message to be translated.'),
  targetLanguage: z.string().describe('The language to translate the message to.'),
});
export type TranslateMessageInput = z.infer<typeof TranslateMessageInputSchema>;

const TranslateMessageOutputSchema = z.object({
  translatedMessage: z.string().describe('The translated message.'),
});
export type TranslateMessageOutput = z.infer<typeof TranslateMessageOutputSchema>;

export async function translateMessage(input: TranslateMessageInput): Promise<TranslateMessageOutput> {
  return translateMessageFlow(input);
}

const translateMessagePrompt = ai.definePrompt({
  name: 'translateMessagePrompt',
  input: {schema: TranslateMessageInputSchema},
  output: {schema: TranslateMessageOutputSchema},
  prompt: `Translate the following message to {{{targetLanguage}}}:\n\n{{{message}}}`, // Corrected template syntax
});

const translateMessageFlow = ai.defineFlow(
  {
    name: 'translateMessageFlow',
    inputSchema: TranslateMessageInputSchema,
    outputSchema: TranslateMessageOutputSchema,
  },
  async input => {
    const {output} = await translateMessagePrompt(input);
    return output!;
  }
);
