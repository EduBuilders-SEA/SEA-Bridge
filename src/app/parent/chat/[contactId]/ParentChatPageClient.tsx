'use client';

import { chunkMessageForSms } from '@/ai/flows/chunk-message-for-sms';
import { simplifyMessage } from '@/ai/flows/simplify-message';
import {
  summarizeConversation,
  type SummarizeConversationOutput,
} from '@/ai/flows/summarize-conversation';
import { summarizeDocument } from '@/ai/flows/summarize-document';
import { transcribeAndTranslate } from '@/ai/flows/transcribe-and-translate';
import ChatMessage from '@/components/chat/chat-message';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import { DateRangePicker } from '@/components/chat/date-range-picker';
import MessageInput from '@/components/chat/message-input';
import {
  ProgressSummaryCard,
  ProgressSummaryCardSkeleton,
} from '@/components/chat/progress-summary-card';
import { useLanguageStore } from '@/components/store/language-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useContacts } from '@/hooks/use-contacts';
import { useFastAutoTranslation } from '@/hooks/use-fast-auto-translation';
import { useMessageQuery } from '@/hooks/use-message-query';
import { useCurrentProfile } from '@/hooks/use-profile';
import { useRealtimeMessages } from '@/hooks/use-realtime-messages';
import { useToast } from '@/hooks/use-toast';
import { notFound, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function ParentChatPageClient({
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
  const { data: initialMessages, isLoading: _messagesLoading } =
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

  const { selectedLanguage: parentLanguage } = useLanguageStore();

  // ✅ Auto-translation integration
  const {
    messages: translatedMessages,
    isTranslating,
    userLanguage: _userLanguage,
  } = useFastAutoTranslation(allMessages, user?.uid ?? '', parentLanguage);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  const [parentName, setParentName] = useState('Parent');
  const [summary, setSummary] = useState<SummarizeConversationOutput | null>(
    null
  );
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Smart scroll state
  const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);
  const [isScrollAreaReady, setIsScrollAreaReady] = useState(false);
  const [hasNewMessages, setHasNewMessages] = useState(false);

  // Find the contact from the real contacts data
  const contact = contacts.find((c) => c.id === contactId);

  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/onboarding?role=parent');
      } else if (profile && profile.role !== 'parent') {
        router.push(`/${profile.role}`);
      } else if (profile) {
        setParentName(profile.name || 'Parent');
      }
    }
  }, [user, profile, authLoading, profileLoading, router]);

  // TODO: Add auto-translation logic + optimize it

  // useEffect(() => {
  //   const autoTranslateMessages = async () => {
  //     if (parentLanguage === 'English') return;

  //     const messagesToTranslate = allMessages.filter(
  //       (m) =>
  //         m.sender_id !== user?.uid &&
  //         m.message_type === 'text' &&
  //         !m.variants?.translatedContent
  //     );

  //     if (messagesToTranslate.length === 0) return;

  //     try {
  //       const translationPromises = messagesToTranslate.map((message) =>
  //         translateMessage({
  //           content: message.content,
  //           targetLanguage: parentLanguage,
  //         }).then((result) => ({
  //           id: message.id,
  //           translatedContent: result.translation,
  //         }))
  //       );

  //       const translations = await Promise.all(translationPromises);

  //       // Note: In a real app, you'd update the message variants in the database
  //       // For now, this demonstrates the translation functionality
  //       toast({
  //         title: 'Auto-translation Complete',
  //         description: `Translated ${translations.length} messages to ${parentLanguage}`,
  //       });
  //     } catch (error) {
  //       console.error('Failed to auto-translate messages:', error);
  //       toast({
  //         variant: 'destructive',
  //         title: 'Error',
  //         description: 'Could not automatically translate messages.',
  //       });
  //     }
  //   };

  //   if (allMessages.length > 0) {
  //     autoTranslateMessages();
  //   }
  // }, [parentLanguage, allMessages, user?.uid, toast]);

  // ✅ Track when ScrollArea is mounted and ready
  useEffect(() => {
    if (scrollAreaRef.current) {
      setIsScrollAreaReady(true);
    }
  }, []);

  // ✅ Smart initial scroll - only scroll to bottom on first load
  useEffect(() => {
    if (
      isScrollAreaReady &&
      !hasInitiallyScrolled &&
      !_messagesLoading &&
      initialMessages &&
      initialMessages.length > 0 &&
      scrollAreaRef.current
    ) {
      // Small delay to ensure DOM is fully rendered
      const timeoutId = setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
          setHasInitiallyScrolled(true);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [isScrollAreaReady, hasInitiallyScrolled, _messagesLoading, initialMessages]);

  // ✅ Show new messages indicator when user is scrolled up
  useEffect(() => {
    if (realtimeMessages.length > 0 && scrollAreaRef.current && hasInitiallyScrolled) {
      const isNearBottom =
        scrollAreaRef.current.scrollHeight - scrollAreaRef.current.scrollTop
        < scrollAreaRef.current.clientHeight + 100;

      if (!isNearBottom) {
        setHasNewMessages(true);
      }
    }
  }, [realtimeMessages, hasInitiallyScrolled]);

  // Show loading while any required data is loading
  if (authLoading || profileLoading || contactsLoading) {
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

  const parent = {
    name: parentName,
    avatarUrl: 'https://placehold.co/100x100.png',
    role: 'Parent',
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
      const teacherName =
        contact.teacher?.name ?? contact.teacher?.phone ?? 'Teacher';
      const smsContent = `(Simulated SMS sent to ${teacherName})\\n---\\n${result.chunks.join(
        '\\n---\\n'
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
        targetLanguage: parentLanguage,
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

  const handleSimplify = async (messageId: string) => {
    const message = allMessages.find((m) => m.id === messageId);
    if (!message || message.variants?.simplifiedContent) return;

    try {
      await simplifyMessage({ content: String(message.content) });
      // Note: In a real app, you'd update the message variants in the database
      toast({
        title: 'Message Simplified',
        description: 'The message has been simplified for easier reading.',
      });
    } catch (error) {
      console.error('Failed to simplify message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not simplify the message. Please try again.',
      });
    }
  };

  const handleSummarize = async (messageId: string) => {
    const message = allMessages.find((m) => m.id === messageId);
    if (!message || message.variants?.summary) return;

    try {
      // For document messages, summarize the content
      await summarizeDocument({
        documentContent: String(message.content),
      });
      // Note: In a real app, you'd update the message variants in the database
      toast({
        title: 'Document Summarized',
        description: 'The document has been summarized.',
      });
    } catch (error) {
      console.error('Failed to summarize document:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not summarize the document. Please try again.',
      });
    }
  };

  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    setSummary(null);
    try {
      const conversationToSummarize = allMessages.map(
        ({ sender_id, content }: { sender_id: string; content: string }) => ({
          sender: (sender_id === user?.uid ? 'parent' : 'teacher') as
            | 'teacher'
            | 'parent',
          content: String(content),
        })
      );
      // Mock attendance data for parent view (read-only)
      const mockAttendance = { present: 18, absent: 1, tardy: 1 };
      const result = await summarizeConversation({
        messages: conversationToSummarize,
        attendance: mockAttendance,
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

  const onTabChange = (tab: string) => {
    if (tab === 'summary' && !summary && !isGeneratingSummary) {
      generateSummary();
    }
  };

  const teacherName =
    contact.teacher?.name ?? contact.teacher?.phone ?? 'Teacher';
  const layoutTitle = `Conversation with ${teacherName}`;
  const layoutUser = {
    name: parent.name,
    avatarUrl: parent.avatarUrl,
    role: 'Parent',
  } as const;

  return (
    <ChatPageLayout
      title={layoutTitle}
      user={layoutUser}
      userLanguage={parentLanguage}
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
          className='flex-1 flex flex-col overflow-hidden relative'
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
                onSimplify={handleSimplify}
                onSummarize={handleSummarize}
                contactId={contactId}
                channel={channel}
                isNewMessage={newMessageIds.has(msg.id)}
              />
            ))}
          </div>
          {hasNewMessages && (
            <button
              onClick={() => {
                if (scrollAreaRef.current) {
                  scrollAreaRef.current.scrollTo({
                    top: scrollAreaRef.current.scrollHeight,
                    behavior: 'smooth',
                  });
                  setHasNewMessages(false);
                }
              }}
              className='absolute bottom-20 right-4 bg-primary text-primary-foreground px-3 py-2 rounded-full shadow-lg hover:bg-primary/90 transition-colors'
            >
              ↓ New Messages
            </button>
          )}
          <div className='p-4 md:p-6 pt-2 border-t bg-background'>
            <MessageInput
              contactId={contactId}
              onSendMessage={handleSendMessage}
              onSendSms={handleSendSms}
              onSendVoice={handleSendVoice}
              onSendFile={handleSendFile}
              placeholder={`Reply in ${parentLanguage}...`}
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
          {isGeneratingSummary && <ProgressSummaryCardSkeleton />}
          {summary && !isGeneratingSummary && (
            <ProgressSummaryCard
              studentName={contact.student_name ?? 'Your Child'}
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
