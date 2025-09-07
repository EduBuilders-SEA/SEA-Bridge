'use client';

import { simplifyMessage } from '@/ai/flows/simplify-message';
import {
  summarizeConversation,
  type SummarizeConversationOutput,
} from '@/ai/flows/summarize-conversation';
import { summarizeDocument } from '@/ai/flows/summarize-document';
import { transcribeAndTranslate } from '@/ai/flows/transcribe-and-translate';
import { translateMessage } from '@/ai/flows/translate-message';
import ChatMessage from '@/components/chat/chat-message';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import { DateRangePicker } from '@/components/chat/date-range-picker';
import MessageInput from '@/components/chat/message-input';
import {
  ProgressSummaryCard,
  ProgressSummaryCardSkeleton,
} from '@/components/chat/progress-summary-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { useMessages, type UIMessage } from '@/hooks/use-messages';
import { useRealtimeMessages } from '@/hooks/use-realtime-messages';
import { useCurrentProfile } from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
import { contacts } from '@/lib/contacts';
import { documentContent } from '@/lib/data';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';

function ChatSkeleton() {
  return (
    <div className='flex flex-col h-full'>
      <div className='flex justify-center p-2 border-b'>
        <div className='flex items-center space-x-2'>
          <Skeleton className='h-8 w-20' />
          <Skeleton className='h-8 w-20' />
        </div>
      </div>
      <div className='flex-1 space-y-4 overflow-y-auto p-4 md:p-6'>
        <div className='flex items-end gap-2 justify-start'>
          <Skeleton className='h-16 w-3/4 rounded-lg' />
        </div>
        <div className='flex items-end gap-2 justify-end'>
          <Skeleton className='h-12 w-1/2 rounded-lg' />
        </div>
        <div className='flex items-end gap-2 justify-start'>
          <Skeleton className='h-24 w-3/4 rounded-lg' />
        </div>
      </div>
      <div className='p-4 md:p-6 pt-2 border-t bg-background'>
        <Skeleton className='h-10 w-full' />
      </div>
    </div>
  );
}

function ParentChatPageComponent({
  params: { contactId },
}: {
  params: { contactId: string };
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = searchParams.get('lang');
  
  // Use real data hooks instead of mock state
  const { messages, sendMessage, isLoading } = useMessages(contactId);
  useRealtimeMessages(contactId);
  
  const [parentName, setParentName] = useState('Parent');
  const [summary, setSummary] = useState<SummarizeConversationOutput | null>(
    null
  );
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [parentLanguage] = useState(lang ?? 'English');
  
  // Convert to local state for AI features (translation, simplification, etc.)
  const [enhancedMessages, setEnhancedMessages] = useState<(UIMessage & {
    translatedContent?: string;
    isTranslating?: boolean;
    simplifiedContent?: string;
    isSimplifying?: boolean;
    transcription?: string;
    isTranscribing?: boolean;
    audioDataUri?: string;
    summary?: string;
    isSummarizing?: boolean;
  })[]>([]);
  
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useCurrentProfile();

  const contact = contacts.find(
    (c) => c.id === contactId && c.role === 'teacher'
  );

  // Sync real messages with enhanced messages for AI features
  useEffect(() => {
    setEnhancedMessages(messages.map(msg => ({ ...msg })));
  }, [messages]);

  // Move ALL useEffect hooks here - BEFORE any early returns
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (!user) {
        router.push('/onboarding?role=parent');
      } else if (profile && profile.role !== 'parent') {
        router.push(`/${profile.role}`);
      } else if (profile) {
        setParentName(profile.name);
      }
    }
  }, [user, profile, authLoading, profileLoading, router]);

  useEffect(() => {
    const autoTranslateMessages = async () => {
      if (parentLanguage === 'English') return;

      const messagesToTranslate = enhancedMessages.filter(
        (m) =>
          m.sender === 'teacher' && m.type === 'text' && !m.translatedContent
      );

      if (messagesToTranslate.length === 0) return;

      setEnhancedMessages((prev) =>
        prev.map((m) =>
          messagesToTranslate.find((mt) => mt.id === m.id)
            ? { ...m, isTranslating: true }
            : m
        )
      );

      try {
        const translationPromises = messagesToTranslate.map((message) =>
          translateMessage({
            content: message.content,
            targetLanguage: parentLanguage,
          }).then((result) => ({
            id: message.id,
            translatedContent: result.translation,
          }))
        );

        const translations = await Promise.all(translationPromises);

        setEnhancedMessages((prev) =>
          prev.map((m) => {
            const translation = translations.find((t) => t.id === m.id);
            return translation
              ? {
                  ...m,
                  translatedContent: translation.translatedContent,
                  isTranslating: false,
                }
              : m;
          })
        );
      } catch (error) {
        console.error('Failed to auto-translate messages:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not automatically translate messages.',
        });
        setEnhancedMessages((prev) =>
          prev.map((m) =>
            messagesToTranslate.find((mt) => mt.id === m.id)
              ? { ...m, isTranslating: false }
              : m
          )
        );
      }
    };
    autoTranslateMessages();
  }, [parentLanguage, enhancedMessages, toast]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [enhancedMessages]);

  // NOW you can have early returns
  if (authLoading || profileLoading || isLoading) {
    return <ChatSkeleton />;
  }

  if (!user || !profile) {
    return null;
  }

  if (!contact) {
    notFound();
  }

  const parent = {
    name: parentName,
    avatarUrl: 'https://placehold.co/100x100.png',
    role: 'Parent',
  };

  const handleSendMessage = (content: string) => {
    sendMessage({
      content,
      message_type: 'text',
    });
  };

  const handleSendVoice = async (audioDataUri: string) => {
    // Send initial voice message while processing
    sendMessage({
      content: 'Voice note',
      message_type: 'voice',
    });

    try {
      const result = await transcribeAndTranslate({
        audioDataUri,
        targetLanguage: 'English', // Teacher's language is assumed to be English for now
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

  const handleSimplify = async (messageId: string) => {
    const message = enhancedMessages.find((m) => m.id === messageId);
    if (!message || message.simplifiedContent) return;

    setEnhancedMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isSimplifying: true } : m))
    );
    try {
      const result = await simplifyMessage({ content: message.content });
      setEnhancedMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                simplifiedContent: result.simplifiedContent,
                isSimplifying: false,
              }
            : m
        )
      );
    } catch (error) {
      console.error('Failed to simplify message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not simplify the message. Please try again.',
      });
      setEnhancedMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isSimplifying: false } : m
        )
      );
    }
  };

  const handleSummarize = async (messageId: string) => {
    const message = enhancedMessages.find((m) => m.id === messageId);
    if (!message || message.summary) return;

    setEnhancedMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isSummarizing: true } : m))
    );
    try {
      // In a real app, you would fetch the document content. Here, we use mock data.
      const result = await summarizeDocument({ documentContent });
      setEnhancedMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, summary: result.summary, isSummarizing: false }
            : m
        )
      );
    } catch (error) {
      console.error('Failed to summarize document:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not summarize the document. Please try again.',
      });
      setEnhancedMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isSummarizing: false } : m
        )
      );
    }
  };

  const onTabChange = async (tab: string) => {
    if (tab === 'summary' && !summary && !isGeneratingSummary) {
      setIsGeneratingSummary(true);
      try {
        const conversationToSummarize = enhancedMessages.map(({ sender, content }) => ({
          sender,
          content,
        }));
        // Mock attendance data for now. In a real app, this would be fetched.
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
    }
  };

  // Pass user's name to ChatPageLayout, but for the other person in chat.
  const layoutTitle = `Conversation with ${contact.name}`;
  const layoutUser = {
    name: parent.name,
    avatarUrl: parent.avatarUrl,
    role: 'Parent',
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
            <TabsTrigger value='summary'>Summary</TabsTrigger>
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
            {enhancedMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                currentUser='parent'
                onSimplify={handleSimplify}
                onSummarize={handleSummarize}
              />
            ))}
          </div>
          <div className='p-4 md:p-6 pt-2 border-t bg-background'>
            <MessageInput
              onSendMessage={handleSendMessage}
              onSendVoice={handleSendVoice}
              onSendFile={handleSendFile}
              placeholder={`Reply in ${parentLanguage}...`}
            />
          </div>
        </TabsContent>
        <TabsContent
          value='summary'
          className='flex-1 overflow-y-auto p-4 md:p-6'
        >
          <div className='flex justify-end mb-4'>
            <DateRangePicker />
          </div>
          {isGeneratingSummary && <ProgressSummaryCardSkeleton />}
          {summary && (
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

export default async function ParentChatPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const resolvedParams = await params;
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ParentChatPageComponent params={resolvedParams} />
    </Suspense>
  );
}
