import { z } from 'zod';

export const ProfileUpdateSchema = z
  .object({
    name: z.string().min(2, 'Please enter your full name.'),
  })
  .strict();

export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;
