'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a welcome message to new students' parents.
 *
 * The flow takes the teacher's name, student's name, and parent's preferred language as input.
 * It returns a generated welcome message translated to the parent's preferred language.
 *
 * @interface GenerateWelcomeMessageInput - The input type for the generateWelcomeMessage function.
 * @interface GenerateWelcomeMessageOutput - The output type for the generateWelcomeMessage function.
 * @function generateWelcomeMessage - A function that generates a welcome message to new students' parents.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateWelcomeMessageInputSchema = z.object({
  teacherName: z.string().describe('The name of the teacher.'),
  studentName: z.string().describe('The name of the student.'),
  parentLanguage: z.string().describe('The preferred language of the parent.'),
});
export type GenerateWelcomeMessageInput = z.infer<typeof GenerateWelcomeMessageInputSchema>;

const GenerateWelcomeMessageOutputSchema = z.object({
  welcomeMessage: z.string().describe('The generated welcome message in the parent\'s preferred language.'),
});
export type GenerateWelcomeMessageOutput = z.infer<typeof GenerateWelcomeMessageOutputSchema>;

export async function generateWelcomeMessage(input: GenerateWelcomeMessageInput): Promise<GenerateWelcomeMessageOutput> {
  return generateWelcomeMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateWelcomeMessagePrompt',
  input: {schema: GenerateWelcomeMessageInputSchema},
  output: {schema: GenerateWelcomeMessageOutputSchema},
  prompt: `You are a helpful assistant that generates welcome messages from teachers to parents in the language that the parent understands.

  The teacher's name is: {{{teacherName}}}.
  The student's name is: {{{studentName}}}.
  The parent's preferred language is: {{{parentLanguage}}}.

  Please generate a warm and welcoming message to the parents, introducing the teacher and expressing excitement for the upcoming school year. Translate the message to the parent's preferred language.
  `,
});

const generateWelcomeMessageFlow = ai.defineFlow(
  {
    name: 'generateWelcomeMessageFlow',
    inputSchema: GenerateWelcomeMessageInputSchema,
    outputSchema: GenerateWelcomeMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
