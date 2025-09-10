import { Suspense } from 'react';
import TeacherChatPageClient from './TeacherChatPageClient';
import { ChatSkeleton } from '@/components/chat/chat-skeleton';

export default async function TeacherChatPage({
  params,
}: {
  params: { contactId: string };
}) {
  const { contactId } = params;


  return (
    <Suspense fallback={<ChatSkeleton />}>
      <TeacherChatPageClient contactId={contactId} />
    </Suspense>
  );
}
