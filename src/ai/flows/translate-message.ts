'use server';
/**
 * @fileOverview A flow for translating a message into a specified language.
 *
 * - translateMessage - A function that takes a message and returns its translation.
 * - TranslateMessageInput - The input type for the translateMessage function.
 * - TranslateMessageOutput - The return type for the translateMessage function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const TranslateMessageInputSchema = z.object({
  content: z.string().describe('The text content of the message to be translated.'),
  targetLanguage: z.string().describe('The language to translate the message into (e.g., "Vietnamese", "English").'),
});
export type TranslateMessageInput = z.infer<typeof TranslateMessageInputSchema>;

const TranslateMessageOutputSchema = z.object({
  translation: z.string().describe('The translated text.'),
});
export type TranslateMessageOutput = z.infer<typeof TranslateMessageOutputSchema>;

export async function translateMessage(input: TranslateMessageInput): Promise<TranslateMessageOutput> {
  return translateMessageFlow(input);
}

const translateMessagePrompt = ai.definePrompt({
  name: 'translateMessagePrompt',
  input: { schema: TranslateMessageInputSchema },
  output: { schema: TranslateMessageOutputSchema },
  prompt: `You are an expert translator specializing in communication between teachers and parents in Southeast Asia.
Your task is to translate the given message into the target language accurately.

**Crucial Instruction:** You MUST preserve any critical information exactly as it appears in the original message. This includes:
- Dates (e.g., "November 5th", "11/05/2023")
- Times (e.g., "3:00 PM", "15:00")
- Names (e.g., "Mr. Chen", "Wei", "Mrs. Davison")
- Locations (e.g., "the school auditorium")
- Fees or monetary values (e.g., "$25", "500,000 VND")
- Specific item names (e.g., "permission slip", "Science_Syllabus.pdf")

Do not alter or localize these specific entities.

Original Message:
"{{content}}"

Translate the above message into {{targetLanguage}}.

**Response Format:** Return only a JSON object with this exact structure:
{"translation": "your translated text here"}
`,
});

const translateMessageFlow = ai.defineFlow(
  {
    name: 'translateMessageFlow',
    inputSchema: TranslateMessageInputSchema,
    outputSchema: TranslateMessageOutputSchema,
  },
  async (input) => {
    const { output } = await translateMessagePrompt(input);
    if (!output) {
      throw new Error('Failed to generate translation.');
    }
    return output;
  }
);
