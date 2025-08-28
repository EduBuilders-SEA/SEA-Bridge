
"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import MessageInput from '@/components/chat/message-input';
import ChatMessage from '@/components/chat/chat-message';
import { conversation, type Message } from '@/lib/data';
import { useToast } from "@/hooks/use-toast"
import { notFound, useSearchParams, useRouter } from 'next/navigation';
import { contacts } from '@/lib/contacts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProgressSummaryCard, ProgressSummaryCardSkeleton } from '@/components/chat/progress-summary-card';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { summarizeConversation, type SummarizeConversationOutput } from '@/ai/flows/summarize-conversation';


type DisplayMessage = Message & {
  translatedContent?: string;
  isTranslating?: boolean;
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

  const [messages, setMessages] = useState<DisplayMessage[]>(conversation);
  const [parentLanguage, setParentLanguage] = useState(lang || 'English');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast()

  const contact = contacts.find(c => c.id === contactId && c.role === 'teacher');
  
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

  const handleTranslate = async (messageId: string) => {
    // Placeholder logic, real implementation removed
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isTranslating: true } : m));
    console.log(`Translating message ${messageId}`);
    setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isTranslating: false, translatedContent: `[Translated content for: ${m.content}]` } : m));
    }, 1000);
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
                onTranslate={handleTranslate}
              />
            ))}
          </div>
          <div className="p-4 md:p-6 pt-2 border-t bg-background">
            <MessageInput onSendMessage={handleSendMessage} placeholder={`Reply in ${parentLanguage}...`} />
          </div>
        </TabsContent>
         <TabsContent value="summary" className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="flex justify-end mb-4">
                 {/* Placeholder for Date Range Picker */}
                <Card className="p-2"><CardContent className="p-0">Date Range Picker Coming Soon</CardContent></Card>
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
