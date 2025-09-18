import { isValidPhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';

export const PhoneSchema = z
  .object({
    phoneNumber: z.string().refine(isValidPhoneNumber, {
      message: 'Please enter a valid phone number.',
    }),
  })
  .strict();

export type PhoneForm = z.infer<typeof PhoneSchema>;

export const OtpSchema = z
  .object({
    otp: z.string().min(6, { message: 'OTP must be 6 digits.' }),
  })
  .strict();

export type OtpForm = z.infer<typeof OtpSchema>;