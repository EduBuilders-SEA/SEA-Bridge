'use server';

import {
  summarizeConversation,
  type SummarizeConversationOutput,
} from '@/ai/flows/summarize-conversation';
import { isRiskyAttendance, sendSms } from '@/lib/aws/sns-client';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const GenerateMonthlySummaryInput = z.object({
  contactId: z.string().uuid(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  sendRiskAlert: z.boolean().optional(),
});

export type GenerateMonthlySummaryInputType = z.infer<
  typeof GenerateMonthlySummaryInput
>;

export async function generateMonthlySummary(
  input: GenerateMonthlySummaryInputType
): Promise<
  SummarizeConversationOutput & { dateRange: { from: string; to: string } }
> {
  const { contactId } = GenerateMonthlySummaryInput.parse(input);
  const now = new Date();
  const fromDate = input.from
    ? new Date(input.from)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const toDate = input.to
    ? new Date(input.to)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  console.log('generateMonthlySummary called with:', {
    contactId,
    fromDate: fromDate.toISOString(),
    toDate: toDate.toISOString(),
  });

  const supabase = await createClient();

  // 1) Fetch messages in range
  const { data: messageRows, error: msgErr } = await supabase
    .from('messages')
    .select('sender_id, content, sent_at, contact_link_id')
    .eq('contact_link_id', contactId)
    .gte('sent_at', fromDate.toISOString())
    .lte('sent_at', toDate.toISOString())
    .order('sent_at', { ascending: true });

  if (msgErr) throw msgErr;

  // 1b) Determine teacher and parent ids for sender labeling
  const { data: contactRow, error: contactErr } = await supabase
    .from('contacts')
    .select('id, parent_id, teacher_id, student_name')
    .eq('id', contactId)
    .single();

  if (contactErr) {
    console.error('Contact query error:', contactErr);
    console.error('Queried contactId:', contactId);
    throw contactErr;
  }

  if (!contactRow) {
    throw new Error(`Contact not found for ID: ${contactId}`);
  }

  // 2) Fetch attendance in range and aggregate
  const { data: attendanceRows, error: attErr } = await supabase
    .from('attendance')
    .select('date, status')
    .eq('contact_link_id', contactId)
    .gte('date', fromDate.toISOString().slice(0, 10))
    .lte('date', toDate.toISOString().slice(0, 10));

  if (attErr) {
    console.error('Attendance query error:', attErr);
    throw attErr;
  }

  const attendanceAgg = (attendanceRows || []).reduce(
    (acc, row) => {
      if (row.status === 'present') acc.present += 1;
      else if (row.status === 'absent') acc.absent += 1;
      else if (row.status === 'late') acc.tardy += 1;
      return acc;
    },
    { present: 0, absent: 0, tardy: 0 }
  );

  // 3) Build LLM-ready messages
  const messagesForLLM = (messageRows || []).map((m) => ({
    sender:
      m.sender_id === contactRow.teacher_id
        ? ('teacher' as const)
        : ('parent' as const),
    content: String(m.content ?? ''),
  }));

  const summary = await summarizeConversation({
    messages: messagesForLLM,
    attendance: attendanceAgg,
  });

  // 4) Optional: risk alert via SNS
  if ((input.sendRiskAlert ?? true) && isRiskyAttendance(attendanceAgg)) {
    // Fetch parent profile (phone)
    const { data: parent, error: parentErr } = await supabase
      .from('profiles')
      .select('phone, name')
      .eq('id', contactRow.parent_id)
      .single();

    if (!parentErr && parent?.phone) {
      const alertText = `Attendance Alert for ${contactRow.student_name}: Absent ${attendanceAgg.absent}, Tardy ${attendanceAgg.tardy} this month. Please contact the teacher if you need support.`;
      try {
        await sendSms({
          phoneNumber: parent.phone,
          message: alertText,
          senderId: process.env.SNS_SENDER_ID || 'School',
        });
      } catch (e) {
        console.warn('SNS send failed', e);
      }
    }
  }

  return {
    ...summary,
    attendance: attendanceAgg,
    dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
  };
}
