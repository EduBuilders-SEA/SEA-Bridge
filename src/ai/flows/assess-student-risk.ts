'use server';
/**
 * @fileOverview A flow for analyzing student attendance and communication data to identify learning risks.
 *
 * - assessStudentRisk - A function that analyzes attendance and chat data to identify potential risks
 * - AssessStudentRiskInput - The input type for the function
 * - AssessStudentRiskOutput - The return type for the function
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AssessStudentRiskInputSchema = z.object({
  attendance: z.array(
    z.object({
      date: z.string().describe('Date in YYYY-MM-DD format'),
      status: z.enum(['present', 'absent', 'late', 'excused']),
      notes: z.string().optional(),
    })
  ).describe('Recent attendance records for the student'),
  chatHistory: z.array(z.string()).describe('Recent messages between teacher and parent'),
  studentName: z.string().describe('Name of the student being assessed'),
});
export type AssessStudentRiskInput = z.infer<typeof AssessStudentRiskInputSchema>;

const AssessStudentRiskOutputSchema = z.object({
  riskLevel: z.enum(['none', 'low', 'medium', 'high']).describe('Assessed risk level for the student'),
  triggerReason: z.string().describe('Detailed explanation of why this risk level was assigned'),
  recommendedAction: z.string().describe('Suggested intervention approach'),
});
export type AssessStudentRiskOutput = z.infer<typeof AssessStudentRiskOutputSchema>;

export async function assessStudentRisk(input: AssessStudentRiskInput): Promise<AssessStudentRiskOutput> {
  return assessStudentRiskFlow(input);
}

const assessStudentRiskPrompt = ai.definePrompt({
  name: 'assessStudentRiskPrompt',
  input: { schema: AssessStudentRiskInputSchema },
  output: { schema: AssessStudentRiskOutputSchema },
  prompt: `You are an expert student success analyst specializing in Southeast Asian educational contexts.

Your task is to analyze attendance records and parent-teacher communication to identify potential learning risks for students.

**Assessment Criteria:**
- **High Risk**: 3+ absences in recent 5 days, or patterns indicating serious family/academic issues
- **Medium Risk**: 2 absences in recent 5 days, or concerning patterns in communication
- **Low Risk**: 1 absence in recent 5 days, or minor concerns mentioned
- **None**: Good attendance and positive communication patterns

**Cultural Context Considerations:**
- Family obligations and cultural events are common in Southeast Asia
- Economic pressures may affect school attendance
- Language barriers may impact parent-teacher communication
- Extended family involvement is typical and should be leveraged

**Data to Analyze:**

Student: {{studentName}}

Attendance Records:
{{#each attendance}}
- {{date}}: {{status}}{{#if notes}} ({{notes}}){{/if}}
{{/each}}

Recent Communication:
{{#each chatHistory}}
- {{this}}
{{/each}}

Analyze the above data and provide your assessment.
`,
});

const assessStudentRiskFlow = ai.defineFlow(
  {
    name: 'assessStudentRiskFlow',
    inputSchema: AssessStudentRiskInputSchema,
    outputSchema: AssessStudentRiskOutputSchema,
  },
  async (input) => {
    const { output } = await assessStudentRiskPrompt(input);
    if (!output) {
      throw new Error('Failed to generate risk assessment.');
    }
    return output;
  }
);