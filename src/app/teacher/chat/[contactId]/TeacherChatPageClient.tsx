'use client';

import { chunkMessageForSms } from '@/ai/flows/chunk-message-for-sms';
import { type SummarizeConversationOutput } from '@/ai/flows/summarize-conversation';
import { transcribeAndTranslate } from '@/ai/flows/transcribe-and-translate';
// import { AttendanceForm } from '@/components/chat/attendance-form';
import ChatMessage from '@/components/chat/chat-message';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import { DateRangePicker } from '@/components/chat/date-range-picker';
import MessageInput from '@/components/chat/message-input';
import {
  ProgressSummaryCard,
  ProgressSummaryCardSkeleton,
} from '@/components/chat/progress-summary-card';
import { useLanguageStore } from '@/components/store/language-store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useContacts } from '@/hooks/use-contacts';
import { useFastAutoTranslation } from '@/hooks/use-fast-auto-translation';
import { useMessageQuery } from '@/hooks/use-message-query';
import { useCurrentProfile } from '@/hooks/use-profile';
import { useRealtimeMessages } from '@/hooks/use-realtime-messages';
import { useToast } from '@/hooks/use-toast';
import type { Attendance } from '@/lib/schemas';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DateRange } from 'react-day-picker';

export default function TeacherChatPageClient({
  contactId,
}: {
  contactId: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();
  const { contacts, isLoading: contactsLoading } = useContacts();
  const {
    messages: realtimeMessages,
    sendMessage,
    channel,
    newMessageIds,
  } = useRealtimeMessages(contactId);
  const { data: initialMessages, isLoading: messagesLoading } =
    useMessageQuery(contactId);

  // ✅ Better deduplication logic
  const allMessages = useMemo(() => {
    const combined = [...(initialMessages ?? []), ...realtimeMessages];
    const uniqueMessages = combined.filter(
      (message, index, self) =>
        index === self.findIndex((m) => m.id === message.id)
    );
    return uniqueMessages.sort(
      (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    );
  }, [initialMessages, realtimeMessages]);

  const { selectedLanguage: teacherLanguage } = useLanguageStore();

  // ✅ Auto-translation integration
  const {
    messages: translatedMessages,
    isTranslating,
    userLanguage,
  } = useFastAutoTranslation(allMessages, user?.uid ?? '', teacherLanguage);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [teacherName, setTeacherName] = useState('Teacher');
  const [summary, setSummary] = useState<SummarizeConversationOutput | null>(
    null
  );
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [_attendance, setAttendance] = useState<Attendance | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const router = useRouter();

  // Find the contact from the real contacts data
  const contact = contacts.find((c) => c.id === contactId);

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/onboarding?role=teacher');
      } else if (profile && profile.role !== 'teacher') {
        router.push(`/${profile.role}`);
      } else if (profile) {
        setTeacherName(profile.name || 'Teacher');
      }
    }
  }, [user, profile, authLoading, profileLoading, router]);

  // ❌ Removed auto-scroll - let users control their own scrolling!

  // ✅ Include messagesLoading in loading check
  if (authLoading || profileLoading || contactsLoading || messagesLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div>Loading...</div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user || !profile) {
    return null;
  }

  // 404 if contact not found
  if (!contact) {
    notFound();
  }

  const teacher = {
    name: teacherName,
    avatarUrl: 'https://placehold.co/100x100.png',
    role: 'Teacher',
  };

  const handleSendMessage = (content: string) => {
    return sendMessage({
      content,
      message_type: 'text',
    });
  };

  const handleSendSms = async (content: string) => {
    if (!content.trim()) return;

    try {
      const result = await chunkMessageForSms({ content });
      const parentName =
        contact.parent?.name ?? contact.parent?.phone ?? 'Parent';
      const smsContent = `(Simulated SMS sent to ${parentName})\n---\n${result.chunks.join(
        '\n---\n'
      )}`;

      const result2 = sendMessage({
        content: smsContent,
        message_type: 'text',
      });

      toast({
        title: 'SMS Sent (Simulated)',
        description: `Message was split into ${result.chunks.length} chunks.`,
      });

      return result2;
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
    // Return the first message (the "Voice note") so we can persist with that id
    const first = sendMessage({
      content: 'Voice note',
      message_type: 'voice',
    });

    try {
      const result = await transcribeAndTranslate({
        audioDataUri,
        targetLanguage: 'English',
      });

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
    return first;
  };

  const handleSendFile = (file: File) => {
    return sendMessage({
      content: file.name,
      message_type: 'image',
      file_url: URL.createObjectURL(file),
    });
  };

  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    setSummary(null);
    try {
      const from = dateRange?.from?.toISOString();
      const to = dateRange?.to?.toISOString();
      const res = await fetch('/api/summary/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId, from, to, sendRiskAlert: true }),
      });
      if (!res.ok) throw new Error('Request failed');
      const result = await res.json();
      setSummary({
        summaryText: result.summaryText,
        actionItems: result.actionItems,
        attendance: result.attendance,
      });
      setAttendance(result.attendance ?? null);
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

  // Attendance is now aggregated from DB; manual updates disabled.

  const onTabChange = (tab: string) => {
    if (tab === 'summary' && !isGeneratingSummary) {
      generateSummary();
    }
  };

  const parentName = contact.parent?.name ?? contact.parent?.phone ?? 'Parent';
  const layoutTitle = `Conversation with ${parentName}`;
  const layoutUser = {
    name: teacher.name,
    avatarUrl: teacher.avatarUrl,
    role: 'Teacher',
  } as const;

  return (
    <ChatPageLayout
      title={layoutTitle}
      user={layoutUser}
      userLanguage={userLanguage}
    >
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
            {translatedMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                currentUserId={user.uid}
                isTranslating={isTranslating.has(msg.id)}
                contactId={contactId}
                channel={channel}
                isNewMessage={newMessageIds.has(msg.id)}
              />
            ))}
          </div>
          <div className='p-4 md:p-6 border-t bg-background'>
            <MessageInput
              contactId={contactId}
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
          <div className='flex justify-between items-center gap-2'>
            <DateRangePicker value={dateRange} onValueChange={setDateRange} />
            <Button onClick={generateSummary} disabled={isGeneratingSummary}>
              Generate Summary
            </Button>
          </div>
          {/* AttendanceForm removed; now computed from DB */}
          {isGeneratingSummary && <ProgressSummaryCardSkeleton />}
          {summary && !isGeneratingSummary && (
            <ProgressSummaryCard
              studentName={contact.student_name}
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
