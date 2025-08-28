'use server';
/**
 * @fileOverview A flow for summarizing a conversation between a parent and a teacher.
 *
 * - summarizeConversation - A function that takes a conversation and returns a structured summary.
 * - SummarizeConversationInput - The input type for the summarizeConversation function.
 * - SummarizeConversationOutput - The return type for the summarizeConversation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MessageSchema = z.object({
  sender: z.enum(['teacher', 'parent']),
  content: z.string(),
});

export const SummarizeConversationInputSchema = z.object({
  messages: z.array(MessageSchema).describe('The history of the conversation.'),
});
export type SummarizeConversationInput = z.infer<typeof SummarizeConversationInputSchema>;

const ActionItemSchema = z.object({
    text: z.string().describe('The description of the action item or deadline.'),
    type: z.enum(['deadline', 'fee', 'action_item']).describe('The type of the item.'),
});

export const SummarizeConversationOutputSchema = z.object({
  summaryText: z
    .string()
    .describe(
      'A concise summary of the key takeaways from the conversation, formatted as 2-3 bullet points.'
    ),
  actionItems: z.array(ActionItemSchema).describe('A list of extracted action items, deadlines, and fees.'),
});
export type SummarizeConversationOutput = z.infer<typeof SummarizeConversationOutputSchema>;


export async function summarizeConversation(
  input: SummarizeConversationInput
): Promise<SummarizeConversationOutput> {
  return summarizeConversationFlow(input);
}

const summarizeConversationPrompt = ai.definePrompt({
  name: 'summarizeConversationPrompt',
  input: { schema: SummarizeConversationInputSchema },
  output: { schema: SummarizeConversationOutputSchema },
  prompt: `You are an expert assistant for parent-teacher communication.
Your task is to analyze a conversation and provide a clear, actionable summary.

Analyze the following conversation:
{{#each messages}}
- {{sender}}: {{{content}}}
{{/each}}

Based on the conversation, generate the following:
1.  A "summaryText" that includes 2-3 concise bullet points of the most important takeaways.
2.  An "actionItems" array that extracts any deadlines, fees, or specific tasks mentioned for either the parent or teacher.

Ensure your output is a valid JSON object that strictly adheres to the specified output schema.
`,
});

const summarizeConversationFlow = ai.defineFlow(
  {
    name: 'summarizeConversationFlow',
    inputSchema: SummarizeConversationInputSchema,
    outputSchema: SummarizeConversationOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeConversationPrompt(input);
    if (!output) {
      throw new Error('Failed to generate summary.');
    }
    return output;
  }
);
