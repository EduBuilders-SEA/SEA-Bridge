import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import TeacherChatPageClient from './TeacherChatPageClient';

function ChatSkeleton() {
  return (
    <div className='flex items-center justify-center min-h-screen'>
      <div>Loading...</div>
    </div>
  );
}

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
