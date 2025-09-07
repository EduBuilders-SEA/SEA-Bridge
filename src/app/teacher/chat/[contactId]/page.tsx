'use client';

import { chunkMessageForSms } from '@/ai/flows/chunk-message-for-sms';
import {
  summarizeConversation,
  type SummarizeConversationOutput,
} from '@/ai/flows/summarize-conversation';
import { transcribeAndTranslate } from '@/ai/flows/transcribe-and-translate';
import { AttendanceForm } from '@/components/chat/attendance-form';
import ChatMessage from '@/components/chat/chat-message';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import { DateRangePicker } from '@/components/chat/date-range-picker';
import MessageInput from '@/components/chat/message-input';
import {
  ProgressSummaryCard,
  ProgressSummaryCardSkeleton,
} from '@/components/chat/progress-summary-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useMessages } from '@/hooks/use-messages';
import { useRealtimeMessages } from '@/hooks/use-realtime-messages';
import { useCurrentProfile } from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
import { contacts } from '@/lib/contacts';
import type { Attendance } from '@/lib/schemas';
import { notFound, useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

function TeacherChatPageComponent({ contactId }: { contactId: string }) {
  // Use real data hooks instead of mock state
  const { messages, sendMessage, isLoading } = useMessages(contactId);
  useRealtimeMessages(contactId);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [teacherName, setTeacherName] = useState('Teacher');
  const [summary, setSummary] = useState<SummarizeConversationOutput | null>(
    null
  );
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [attendance, setAttendance] = useState<Attendance>({
    present: 18,
    absent: 1,
    tardy: 1,
  });
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/onboarding?role=teacher');
      } else if (profile && profile.role !== 'teacher') {
        router.push(`/${profile.role}`);
      } else if (profile) {
        setTeacherName(profile.name);
      }
    }
  }, [user, profile, authLoading, profileLoading, router]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  if (authLoading || profileLoading || isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const contact = contacts.find(
    (c) => c.id === contactId && c.role === 'parent'
  );

  if (!contact) {
    notFound();
  }

  const teacher = {
    name: teacherName,
    avatarUrl: 'https://placehold.co/100x100.png',
    role: 'Teacher',
  };

  const handleSendMessage = (content: string) => {
    sendMessage({
      content,
      message_type: 'text',
    });
  };

  const handleSendSms = async (content: string) => {
    if (!content.trim()) return;

    try {
      const result = await chunkMessageForSms({ content });
      const smsContent = `(Simulated SMS sent to ${
        contact.name
      })\n---\n${result.chunks.join('\n---\n')}`;

      sendMessage({
        content: smsContent,
        message_type: 'text',
      });

      toast({
        title: 'SMS Sent (Simulated)',
        description: `Message was split into ${result.chunks.length} chunks.`,
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate SMS chunks. Please try again.',
      });
    }
  };

  const handleSendVoice = async (audioDataUri: string) => {
    // Send initial voice message while processing
    sendMessage({
      content: 'Voice note',
      message_type: 'voice',
    });

    try {
      // Teachers send voice notes in English and translate to the parent's language
      const result = await transcribeAndTranslate({
        audioDataUri,
        targetLanguage: contact.language ?? 'English',
      });
      
      // Send the transcribed content as a follow-up
      sendMessage({
        content: result.transcription,
        message_type: 'voice',
      });
    } catch (error) {
      console.error('Failed to transcribe voice note:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not process the voice note. Please try again.',
      });
    }
  };

  const handleSendFile = (file: File) => {
    // For now, send the file name. In a real implementation, 
    // you would upload to Supabase Storage first and get the URL
    sendMessage({
      content: file.name,
      message_type: 'document',
      file_url: URL.createObjectURL(file), // Temporary URL for demo
    });
  };

  const generateSummary = async (currentAttendance: Attendance) => {
    setIsGeneratingSummary(true);
    setSummary(null);
    try {
      const conversationToSummarize = messages.map(({ sender, content }) => ({
        sender,
        content,
      }));
      const result = await summarizeConversation({
        messages: conversationToSummarize,
        attendance: currentAttendance,
      });
      setSummary(result);
    } catch (error) {
      console.error('Failed to generate summary:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate the summary. Please try again.',
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleUpdateAttendance = (newAttendance: Attendance) => {
    setAttendance(newAttendance);
    generateSummary(newAttendance);
  };

  const onTabChange = (tab: string) => {
    if (tab === 'summary' && !summary && !isGeneratingSummary) {
      generateSummary(attendance);
    }
  };

  const layoutTitle = `Conversation with ${contact.name}`;
  const layoutUser = {
    name: teacher.name,
    avatarUrl: teacher.avatarUrl,
    role: 'Teacher',
  };

  return (
    <ChatPageLayout title={layoutTitle} user={layoutUser}>
      <Tabs
        defaultValue='chat'
        className='flex-1 flex flex-col overflow-hidden'
        onValueChange={onTabChange}
      >
        <div className='flex justify-center p-2 border-b'>
          <TabsList>
            <TabsTrigger value='chat'>Chat</TabsTrigger>
            <TabsTrigger value='summary'>Progress Summary</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent
          value='chat'
          className='flex-1 flex flex-col overflow-hidden'
        >
          <div
            className='flex-1 space-y-4 overflow-y-auto p-4 md:p-6'
            ref={scrollAreaRef}
          >
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} currentUser='teacher' />
            ))}
          </div>
          <div className='p-4 md:p-6 pt-2 border-t bg-background'>
            <MessageInput
              onSendMessage={handleSendMessage}
              onSendSms={handleSendSms}
              onSendVoice={handleSendVoice}
              onSendFile={handleSendFile}
            />
          </div>
        </TabsContent>
        <TabsContent
          value='summary'
          className='flex-1 overflow-y-auto p-4 md:p-6 space-y-6'
        >
          <div className='flex justify-end'>
            <DateRangePicker />
          </div>
          <AttendanceForm
            initialData={attendance}
            onUpdateAttendance={handleUpdateAttendance}
          />
          {isGeneratingSummary && <ProgressSummaryCardSkeleton />}
          {summary && !isGeneratingSummary && (
            <ProgressSummaryCard
              studentName={contact.childName}
              summaryText={summary.summaryText}
              actionItems={summary.actionItems}
              attendance={summary.attendance}
            />
          )}
        </TabsContent>
      </Tabs>
    </ChatPageLayout>
  );
}

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
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <TeacherChatPageComponent contactId={contactId} />
    </Suspense>
  );
}
