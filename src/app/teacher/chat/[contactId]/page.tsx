import { Suspense } from 'react';
import TeacherChatPageClient from './TeacherChatPageClient';
import { ChatSkeleton } from '@/components/chat/chat-skeleton';

export default async function TeacherChatPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;


  return (
    <Suspense fallback={<ChatSkeleton />}>
      <TeacherChatPageClient contactId={contactId} />
    </Suspense>
  );
}
