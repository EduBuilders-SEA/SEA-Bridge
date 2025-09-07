'use server';
/**
 * @fileOverview A flow for generating culturally appropriate SMS messages to family members.
 *
 * - generateCulturalSms - A function that creates culturally sensitive SMS messages for family interventions
 * - GenerateCulturalSmsInput - The input type for the function
 * - GenerateCulturalSmsOutput - The return type for the function
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateCulturalSmsInputSchema = z.object({
  studentName: z.string().describe('Name of the student who needs support'),
  request: z.string().describe('Specific type of help needed (e.g., morning routine, homework support)'),
  recipientName: z.string().describe('Name of the family member to contact'),
  recipientRole: z.string().describe('Family role (grandmother, uncle, etc.)'),
  targetLanguage: z.string().describe('Language code for the message (ceb, eng, vie, tgl)'),
  communicationStyle: z.enum(['formal', 'casual', 'respectful']).describe('Preferred communication style'),
  culturalNotes: z.string().describe('Additional cultural context to consider'),
});
export type GenerateCulturalSmsInput = z.infer<typeof GenerateCulturalSmsInputSchema>;

const GenerateCulturalSmsOutputSchema = z.object({
  smsText: z.string().describe('The culturally appropriate SMS message under 160 characters'),
  translation: z.string().optional().describe('English translation if message is in another language'),
});
export type GenerateCulturalSmsOutput = z.infer<typeof GenerateCulturalSmsOutputSchema>;

export async function generateCulturalSms(input: GenerateCulturalSmsInput): Promise<GenerateCulturalSmsOutput> {
  return generateCulturalSmsFlow(input);
}

const generateCulturalSmsPrompt = ai.definePrompt({
  name: 'generateCulturalSmsPrompt',
  input: { schema: GenerateCulturalSmsInputSchema },
  output: { schema: GenerateCulturalSmsOutputSchema },
  prompt: `You are a communications expert specializing in respectful, culturally appropriate messaging for Southeast Asian families.

Your task is to create a concise, polite SMS message that asks for family support in a culturally sensitive way.

**Cultural Guidelines by Language:**

**Cebuano (ceb):**
- Use respectful terms: "Maayong adlaw" (Good day)
- Address elders with respect: "Lola", "Lolo", "Tita", "Tito"
- End with gratitude: "Salamat kaayo" (Thank you very much)
- Use "Palihog" for polite requests

**Filipino/Tagalog (tgl):**
- Use "po" and "opo" for respect
- "Magandang araw" for greetings
- "Makakakuha kaya" for polite asking
- "Maraming salamat po" for thanks

**Vietnamese (vie):**
- Use proper family terms: "Bà" (grandmother), "Chú" (uncle)
- "Xin chào" for greeting
- "Xin vui lòng" for please
- "Cảm ơn" for thanks

**English (eng):**
- Keep formal but warm
- Use family titles respectfully
- Clear, simple language

**Message Requirements:**
- MUST be under 160 characters
- Include clear action request
- End with simple reply instruction (e.g., "Reply YES if you can help")
- Respectful tone appropriate for family hierarchy

**Input Details:**
Student: {{studentName}}
Recipient: {{recipientName}} ({{recipientRole}})
Language: {{targetLanguage}}
Style: {{communicationStyle}}
Request: {{request}}
Cultural Notes: {{culturalNotes}}

Generate an appropriate SMS message for this family intervention.
`,
});

const generateCulturalSmsFlow = ai.defineFlow(
  {
    name: 'generateCulturalSmsFlow',
    inputSchema: GenerateCulturalSmsInputSchema,
    outputSchema: GenerateCulturalSmsOutputSchema,
  },
  async (input) => {
    const { output } = await generateCulturalSmsPrompt(input);
    if (!output) {
      throw new Error('Failed to generate cultural SMS message.');
    }
    return output;
  }
);