'use server';
/**
 * @fileOverview A flow for extracting family network information from parent-teacher conversations.
 *
 * - extractFamilyNetwork - A function that analyzes chat history to identify family members and cultural context
 * - ExtractFamilyNetworkInput - The input type for the function
 * - ExtractFamilyNetworkOutput - The return type for the function
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FamilyMemberSchema = z.object({
  name: z.string().describe('Name of the family member'),
  role: z.string().describe('Family role (e.g., grandmother, uncle, aunt, sibling)'),
  phone: z.string().nullable().describe('Phone number in E.164 format if mentioned'),
  language: z.string().describe('Primary language code (e.g., "ceb" for Cebuano, "eng" for English, "vie" for Vietnamese)'),
  influence: z.enum(['high', 'medium', 'low']).describe('Level of influence in family decisions'),
});

const ExtractFamilyNetworkInputSchema = z.object({
  chatHistory: z.array(z.string()).describe('Messages between teacher and parent'),
  parentPhone: z.string().describe('Phone number of the primary parent contact'),
  studentName: z.string().describe('Name of the student'),
});
export type ExtractFamilyNetworkInput = z.infer<typeof ExtractFamilyNetworkInputSchema>;

const ExtractFamilyNetworkOutputSchema = z.object({
  familyData: z.object({
    members: z.array(FamilyMemberSchema).describe('Identified family members'),
  }),
  culturalContext: z.object({
    primaryDecisionMaker: z.string().describe('Name of the person who makes key family decisions'),
    communicationStyle: z.enum(['formal', 'casual', 'respectful']).describe('Preferred communication approach'),
    culturalNotes: z.string().describe('Important cultural considerations for communication'),
  }),
});
export type ExtractFamilyNetworkOutput = z.infer<typeof ExtractFamilyNetworkOutputSchema>;

export async function extractFamilyNetwork(input: ExtractFamilyNetworkInput): Promise<ExtractFamilyNetworkOutput> {
  return extractFamilyNetworkFlow(input);
}

const extractFamilyNetworkPrompt = ai.definePrompt({
  name: 'extractFamilyNetworkPrompt',
  input: { schema: ExtractFamilyNetworkInputSchema },
  output: { schema: ExtractFamilyNetworkOutputSchema },
  prompt: `You are an expert in Southeast Asian family structures and cultural dynamics.

Your task is to analyze parent-teacher conversations to identify family members, their roles, and cultural context that could be leveraged for student support interventions.

**Key Family Roles to Look For:**
- **Lola/Lolo** (Grandmother/Grandfather) - Often primary decision makers
- **Tita/Tito** (Aunt/Uncle) - Important support figures
- **Kuya/Ate** (Older siblings) - Can provide peer support
- **Extended family** - Cousins, godparents who may live nearby

**Language Indicators:**
- Filipino/Tagalog: "po", "opo", family terms like "Lola", "Tito"
- Cebuano: "Lola" + Cebuano phrases
- Vietnamese: "Bà" (grandmother), "Chú" (uncle), Vietnamese names
- English: Formal family terms, translated roles

**Phone Number Patterns:**
- Philippines: +63 followed by 10 digits
- Vietnam: +84 followed by 9-10 digits
- Look for numbers in formats: 09XX-XXX-XXXX, +63-XXX-XXX-XXXX

**Cultural Context Clues:**
- Respectful language indicates traditional values
- Mentions of extended family suggest strong family networks
- Religious references may indicate community connections

**Chat History to Analyze:**
Student: {{studentName}}
Parent Phone: {{parentPhone}}

Messages:
{{#each chatHistory}}
- {{this}}
{{/each}}

Extract family network information and cultural context from the above conversation.
`,
});

const extractFamilyNetworkFlow = ai.defineFlow(
  {
    name: 'extractFamilyNetworkFlow',
    inputSchema: ExtractFamilyNetworkInputSchema,
    outputSchema: ExtractFamilyNetworkOutputSchema,
  },
  async (input) => {
    const { output } = await extractFamilyNetworkPrompt(input);
    if (!output) {
      throw new Error('Failed to extract family network information.');
    }
    return output;
  }
);