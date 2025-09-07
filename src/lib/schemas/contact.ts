import { z } from 'zod';

export const ContactCreateSchema = z
  .object({
    phoneNumber: z
      .string()
      .regex(/^\+[1-9]\d{7,14}$/u, {
        message: 'Enter a valid phone number with country code',
      }),
    childName: z.string().optional(),
    name: z.string().optional(),
    subject: z.string().optional(),
  })
  .strict(); // or .passthrough() if you want to ignore unknown keys instead

export type ContactCreate = z.infer<typeof ContactCreateSchema>;
