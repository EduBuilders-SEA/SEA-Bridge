import { generateMonthlySummary } from '@/app/actions/generate-monthly-summary';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const BodySchema = z.object({
  contactId: z.string().uuid(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sendRiskAlert: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = BodySchema.parse(json);
    const result = await generateMonthlySummary(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('monthly summary error', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
