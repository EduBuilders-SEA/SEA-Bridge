import { z } from 'zod';

export const AttendanceSchema = z.object({
    present: z.coerce.number().min(0, "Cannot be negative"),
    absent: z.coerce.number().min(0, "Cannot be negative"),
    tardy: z.coerce.number().min(0, "Cannot be negative"),
});

export type Attendance = z.infer<typeof AttendanceSchema>;
