

"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import MessageInput from '@/components/chat/message-input';
import ChatMessage from '@/components/chat/chat-message';
import { conversation, documentContent, type Message } from '@/lib/data';
import { useToast } from "@/hooks/use-toast"
import { notFound, useSearchParams, useRouter } from 'next/navigation';
import { contacts } from '@/lib/contacts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProgressSummaryCard, ProgressSummaryCardSkeleton } from '@/components/chat/progress-summary-card';
import { Skeleton } from '@/components/ui/skeleton';
import { summarizeConversation, type SummarizeConversationOutput } from '@/ai/flows/summarize-conversation';
import { translateMessage } from '@/ai/flows/translate-message';
import { simplifyMessage } from '@/ai/flows/simplify-message';
import { transcribeAndTranslate } from '@/ai/flows/transcribe-and-translate';
import { summarizeDocument } from '@/ai/flows/summarize-document';
import { DateRangePicker } from '@/components/chat/date-range-picker';


type DisplayMessage = Message & {
  translatedContent?: string;
  isTranslating?: boolean;
  simplifiedContent?: string;
  isSimplifying?: boolean;
  transcription?: string;
  isTranscribing?: boolean;
  audioDataUri?: string;
  summary?: string;
  isSummarizing?: boolean;
  fileUrl?: string;
};

function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-center p-2 border-b">
        <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
        <div className="flex items-end gap-2 justify-start">
            <Skeleton className="h-16 w-3/4 rounded-lg" />
        </div>
         <div className="flex items-end gap-2 justify-end">
            <Skeleton className="h-12 w-1/2 rounded-lg" />
        </div>
        <div className="flex items-end gap-2 justify-start">
            <Skeleton className="h-24 w-3/4 rounded-lg" />
        </div>
      </div>
      <div className="p-4 md:p-6 pt-2 border-t bg-background">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

function ParentChatPageComponent({ params: { contactId } }: { params: { contactId: string } }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = searchParams.get('lang');
  const [parentName, setParentName] = useState('Parent');
  const [summary, setSummary] = useState<SummarizeConversationOutput | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>(conversation);
  const [parentLanguage, setParentLanguage] = useState(lang || 'English');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast()

  const contact = contacts.find(c => c.id === contactId && c.role === 'teacher');

  useEffect(() => {
    const storedUser = localStorage.getItem('sea-bridge-user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.role !== 'parent') {
        router.push('/onboarding?role=parent');
      } else {
        setParentName(user.name);
      }
    } else {
      router.push('/onboarding?role=parent');
    }
  }, [router]);

  useEffect(() => {
    const autoTranslateMessages = async () => {
      if (parentLanguage === 'English') return;

      const messagesToTranslate = messages.filter(
        m => m.sender === 'teacher' && m.type === 'text' && !m.translatedContent
      );

      if (messagesToTranslate.length === 0) return;

      setMessages(prev => prev.map(m => messagesToTranslate.find(mt => mt.id === m.id) ? { ...m, isTranslating: true } : m));

      try {
        const translationPromises = messagesToTranslate.map(message =>
          translateMessage({
            content: message.content,
            targetLanguage: parentLanguage,
          }).then(result => ({
            id: message.id,
            translatedContent: result.translation,
          }))
        );

        const translations = await Promise.all(translationPromises);

        setMessages(prev =>
          prev.map(m => {
            const translation = translations.find(t => t.id === m.id);
            return translation ? { ...m, translatedContent: translation.translatedContent, isTranslating: false } : m;
          })
        );
      } catch (error) {
        console.error('Failed to auto-translate messages:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not automatically translate messages.',
        });
        setMessages(prev => prev.map(m => messagesToTranslate.find(mt => mt.id === m.id) ? { ...m, isTranslating: false } : m));
      }
    };

    autoTranslateMessages();
    // We only want this to run once on load, with the initial messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentLanguage]);
  
  if (!contact) {
    notFound();
  }

  const parent = {
    name: parentName,
    avatarUrl: 'https://placehold.co/100x100.png',
    role: 'Parent',
  };

  const addMessage = (message: DisplayMessage) => {
    setMessages(prev => [...prev, message]);
  }

  const handleSendMessage = (content: string) => {
    const newMessage: DisplayMessage = {
      id: String(messages.length + 1),
      sender: 'parent',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      originalLanguage: parentLanguage,
    };
    addMessage(newMessage);
  };
  
  const handleSendVoice = async (audioDataUri: string) => {
    const newId = String(messages.length + 1);
    const newMessage: DisplayMessage = {
      id: newId,
      sender: 'parent',
      content: "Voice note", // Placeholder content
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'voice',
      originalLanguage: parentLanguage,
      isTranscribing: true,
      audioDataUri,
    };
    addMessage(newMessage);

    try {
      const result = await transcribeAndTranslate({ 
        audioDataUri: audioDataUri, 
        targetLanguage: 'English' // Teacher's language is assumed to be English for now
      });
      setMessages(prev =>
        prev.map(m =>
          m.id === newId
            ? { ...m, 
                isTranscribing: false, 
                content: result.transcription, // Use transcription as main content
                transcription: result.transcription,
                translatedContent: result.translation 
              }
            : m
        )
      );
    } catch (error) {
      console.error('Failed to transcribe voice note:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not process the voice note. Please try again.',
      });
      setMessages(prev => prev.map(m => m.id === newId ? { ...m, isTranscribing: false, content: "Error processing voice note" } : m));
    }
  }


  const handleSimplify = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.simplifiedContent) return;

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isSimplifying: true } : m));
    try {
      const result = await simplifyMessage({ content: message.content });
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, simplifiedContent: result.simplifiedContent, isSimplifying: false }
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
       setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isSimplifying: false } : m));
    }
  };

  const handleSummarize = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.summary) return;

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isSummarizing: true } : m));
    try {
      // In a real app, you would fetch the document content. Here, we use mock data.
      const result = await summarizeDocument({ documentContent: documentContent });
      setMessages(prev =>
        prev.map(m =>
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
       setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isSummarizing: false } : m));
    }
  };


  const onTabChange = async (tab: string) => {
    if (tab === 'summary' && !summary && !isGeneratingSummary) {
      setIsGeneratingSummary(true);
      try {
        const conversationToSummarize = messages.map(({ sender, content }) => ({ sender, content }));
        // Mock attendance data for now. In a real app, this would be fetched.
        const mockAttendance = { present: 18, absent: 1, tardy: 1 };
        const result = await summarizeConversation({ 
          messages: conversationToSummarize,
          attendance: mockAttendance
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

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Pass user's name to ChatPageLayout, but for the other person in chat.
  const layoutTitle = `Conversation with ${contact.name}`;
  const layoutUser = { name: parent.name, avatarUrl: parent.avatarUrl, role: 'Parent' };


  return (
    <ChatPageLayout title={layoutTitle} user={layoutUser}>
      <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden" onValueChange={onTabChange}>
        <div className="flex justify-center p-2 border-b">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6" ref={scrollAreaRef}>
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                currentUser="parent"
                onSimplify={handleSimplify}
                onSummarize={handleSummarize}
              />
            ))}
          </div>
          <div className="p-4 md:p-6 pt-2 border-t bg-background">
            <MessageInput 
              onSendMessage={handleSendMessage} 
              onSendVoice={handleSendVoice}
              placeholder={`Reply in ${parentLanguage}...`} 
            />
          </div>
        </TabsContent>
         <TabsContent value="summary" className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="flex justify-end mb-4">
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


export default function ParentChatPage({ params }: { params: { contactId: string } }) {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ParentChatPageComponent params={params} />
    </Suspense>
  )
}
