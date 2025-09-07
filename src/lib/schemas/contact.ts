import { z } from 'zod';

export const ContactCreateSchema = z
  .object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    // E.164 phone number validation: +[country][national], 8-15 digits total
    // Reference: CLAUDE.md guidance
    phoneNumber: z.string().regex(/^\+[1-9]\d{7,14}$/u, {
      message: 'Enter a valid phone number with country code',
    }),
    childName: z.string().optional(),
    subject: z.string().optional(),
  })
  .strict();

export type ContactCreate = z.infer<typeof ContactCreateSchema>;
