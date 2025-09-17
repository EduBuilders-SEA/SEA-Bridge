'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const _TranslateMessageInputSchema = z.object({
  content: z.string().describe('The text content to translate.'),
  targetLanguage: z.string().describe('The target language for translation.'),
  sourceLanguage: z
    .string()
    .optional()
    .describe('The source language (if known).'),
});
export type TranslateMessageInput = z.infer<
  typeof _TranslateMessageInputSchema
>;

const _TranslateMessageOutputSchema = z.object({
  translatedContent: z.string().describe('The translated text.'),
  model: z
    .enum(['sea-lion', 'gemini'])
    .describe('The AI model used for translation.'),
});
export type TranslateMessageOutput = z.infer<
  typeof _TranslateMessageOutputSchema
>;

export async function translateMessage(
  input: TranslateMessageInput
): Promise<TranslateMessageOutput> {
  // Try Ollama SEA-LION first (FAST!)
  try {
    const { seaLionOllama } = await import('@/lib/ollama/sea-lion-client');

    const translation = await seaLionOllama.translateMessage(
      input.content,
      input.targetLanguage,
      input.sourceLanguage
    );

    return {
      translatedContent: translation,
      model: 'sea-lion',
    };
  } catch (error) {
    console.warn('Ollama SEA-LION failed, falling back to Gemini:', error);

    // Gemini fallback
    try {
      const { translation } = await translateMessageFallback({
        content: input.content,
        targetLanguage: input.targetLanguage,
      });

      return {
        translatedContent: translation,
        model: 'gemini',
      };
    } catch (fallbackError) {
      console.error('All translation failed:', fallbackError);
      throw new Error('Translation unavailable');
    }
  }
}

// Gemini fallback (keep this)
const translateMessagePrompt = ai.definePrompt({
  name: 'translateMessagePrompt',
  input: {
    schema: z.object({
      content: z.string(),
      targetLanguage: z.string(),
    }),
  },
  output: {
    schema: z.object({
      translation: z.string(),
    }),
  },
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
`,
});

const translateMessageFallback = ai.defineFlow(
  {
    name: 'translateMessageFallback',
    inputSchema: z.object({
      content: z.string(),
      targetLanguage: z.string(),
    }),
    outputSchema: z.object({
      translation: z.string(),
    }),
  },
  async (input) => {
    const { output } = await translateMessagePrompt(input);
    if (!output) {
      throw new Error('Translation failed');
    }
    return output;
  }
);
