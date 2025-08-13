'use server';

/**
 * @fileOverview A flow to send a message via SMS/WhatsApp.
 *
 * This file defines a Genkit flow for sending a message to a phone number.
 * It simulates sending an SMS and is intended as a fallback for low-connectivity areas.
 *
 * @interface SendSmsInput - The input type for the sendSms function.
 * @interface SendSmsOutput - The output type for the sendSms function.
 * @function sendSms - A function that "sends" a message to a phone number.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SendSmsInputSchema = z.object({
  phoneNumber: z.string().describe('The phone number to send the message to.'),
  message: z.string().describe('The content of the message.'),
  senderRole: z.enum(['teacher', 'parent']).describe('The role of the sender.'),
});
export type SendSmsInput = z.infer<typeof SendSmsInputSchema>;

const SendSmsOutputSchema = z.object({
  status: z.string().describe('The status of the message delivery.'),
  confirmationId: z.string().describe('A unique confirmation ID for the sent message.'),
});
export type SendSmsOutput = z.infer<typeof SendSmsOutputSchema>;

export async function sendSms(input: SendSmsInput): Promise<SendSmsOutput> {
  return sendSmsFlow(input);
}

const sendSmsFlow = ai.defineFlow(
  {
    name: 'sendSmsFlow',
    inputSchema: SendSmsInputSchema,
    outputSchema: SendSmsOutputSchema,
  },
  async (input) => {
    console.log(`Simulating sending SMS to ${input.phoneNumber}`);
    console.log(`Message: ${input.message}`);
    console.log(`From: ${input.senderRole}`);
    
    // In a real application, you would integrate with an SMS gateway like Twilio here.
    // For now, we'll just simulate a successful delivery.
    
    const confirmationId = `sms-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return {
      status: 'Message sent successfully (simulated).',
      confirmationId,
    };
  }
);
