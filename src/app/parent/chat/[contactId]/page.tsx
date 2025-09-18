import { Suspense } from 'react';
import ParentChatPageClient from './ParentChatPageClient';
import { ChatSkeleton } from '@/components/chat/chat-skeleton';

export default async function ParentChatPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;

  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ParentChatPageClient contactId={contactId} />
    </Suspense>
  );
}
