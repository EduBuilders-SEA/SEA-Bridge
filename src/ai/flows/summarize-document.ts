'use server';
/**
 * @fileOverview A flow for summarizing a document into plain language.
 *
 * - summarizeDocument - A function that takes document content and returns a summary.
 * - SummarizeDocumentInput - The input type for the summarizeDocument function.
 * - SummarizeDocumentOutput - The return type for the summarizeDocument function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SummarizeDocumentInputSchema = z.object({
  documentContent: z.string().describe('The full text content of the document to be summarized.'),
});
export type SummarizeDocumentInput = z.infer<typeof SummarizeDocumentInputSchema>;

const SummarizeDocumentOutputSchema = z.object({
  summary: z.string().describe('A concise, plain-language summary of the document.'),
});
export type SummarizeDocumentOutput = z.infer<typeof SummarizeDocumentOutputSchema>;

export async function summarizeDocument(input: SummarizeDocumentInput): Promise<SummarizeDocumentOutput> {
  return summarizeDocumentFlow(input);
}

const summarizeDocumentPrompt = ai.definePrompt({
  name: 'summarizeDocumentPrompt',
  input: { schema: SummarizeDocumentInputSchema },
  output: { schema: SummarizeDocumentOutputSchema },
  prompt: `You are an expert at simplifying complex documents for parents with low literacy.
Your task is to read the following document and provide a short, simple summary.

**Guidelines:**
- Focus on the most critical information: what does the parent *need* to know?
- Extract key dates, required actions, and any costs.
- Use simple, short sentences.
- Avoid jargon and official-sounding language.

Document Content:
---
{{documentContent}}
---

Provide a simple summary of the document.

**Response Format:** Return only a JSON object with this exact structure:
{"summary": "your summary text here"}
`,
});

const summarizeDocumentFlow = ai.defineFlow(
  {
    name: 'summarizeDocumentFlow',
    inputSchema: SummarizeDocumentInputSchema,
    outputSchema: SummarizeDocumentOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeDocumentPrompt(input);
    if (!output) {
      throw new Error('Failed to generate document summary.');
    }
    return output;
  }
);
