
"use client";

import { useState, useRef, useEffect } from 'react';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import MessageInput from '@/components/chat/message-input';
import ChatMessage from '@/components/chat/chat-message';
import { conversation, type Message } from '@/lib/data';
import { useToast } from "@/hooks/use-toast"
import { contacts } from '@/lib/contacts';
import { notFound, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProgressSummaryCard, ProgressSummaryCardSkeleton } from '@/components/chat/progress-summary-card';
import { summarizeConversation, type SummarizeConversationOutput, type AttendanceSchema } from '@/ai/flows/summarize-conversation';
import { transcribeAndTranslate } from '@/ai/flows/transcribe-and-translate';
import { chunkMessageForSms } from '@/ai/flows/chunk-message-for-sms';
import { DateRangePicker } from '@/components/chat/date-range-picker';
import { AttendanceForm } from '@/components/chat/attendance-form';

type DisplayMessage = Message & {
  translatedContent?: string;
  isTranslating?: boolean;
  simplifiedContent?: string;
  isSimplifying?: boolean;
  transcription?: string;
  isTranscribing?: boolean;
  audioDataUri?: string;
  fileUrl?: string;
};

export default function TeacherChatPage({ params: { contactId } }: { params: { contactId: string } }) {
  const [messages, setMessages] = useState<DisplayMessage[]>(conversation);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [teacherName, setTeacherName] = useState('Teacher');
  const [summary, setSummary] = useState<SummarizeConversationOutput | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceSchema>({ present: 18, absent: 1, tardy: 1 });
  const router = useRouter();
  
  useEffect(() => {
    const storedUser = localStorage.getItem('sea-bridge-user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.role !== 'teacher') {
        router.push('/onboarding?role=teacher');
      } else {
        setTeacherName(user.name);
      }
    } else {
      router.push('/onboarding?role=teacher');
    }
  }, [router]);

  const contact = contacts.find(c => c.id === contactId && c.role === 'parent');
  
  if (!contact) {
    notFound();
  }

  const teacher = {
    name: teacherName,
    avatarUrl: 'https://placehold.co/100x100.png',
    role: 'Teacher',
  };

  const addMessage = (message: DisplayMessage) => {
    setMessages(prev => [...prev, message]);
  }

  const handleSendMessage = (content: string) => {
    const newMessage: DisplayMessage = {
      id: String(messages.length + 1),
      sender: 'teacher',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      originalLanguage: 'English',
    };
    addMessage(newMessage);
  };

  const handleSendSms = async (content: string) => {
    if (!content.trim()) return;

    try {
      const result = await chunkMessageForSms({ content });
      const smsContent = `(Simulated SMS sent to ${contact.name})\n---\n${result.chunks.join('\n---\n')}`;
      
      const newMessage: DisplayMessage = {
        id: String(messages.length + 1),
        sender: 'teacher',
        content: smsContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
        originalLanguage: 'English',
      };
      addMessage(newMessage);

      toast({
        title: "SMS Sent (Simulated)",
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
    const newId = String(messages.length + 1);
    const newMessage: DisplayMessage = {
      id: newId,
      sender: 'teacher',
      content: "Voice note", // Placeholder content
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'voice',
      originalLanguage: 'English',
      isTranscribing: true,
      audioDataUri,
    };
    addMessage(newMessage);

    try {
      // Teachers send voice notes in English and translate to the parent's language
      const result = await transcribeAndTranslate({ 
        audioDataUri: audioDataUri, 
        targetLanguage: contact.language || 'English' 
      });
      setMessages(prev =>
        prev.map(m =>
          m.id === newId
            ? { ...m, 
                isTranscribing: false, 
                content: result.transcription, // Use transcription as main content
                transcription: result.transcription,
                translatedContent: result.translation,
                audioDataUri, // Make sure audio is playable
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

  const handleSendFile = (file: File) => {
     const newMessage: DisplayMessage = {
      id: String(messages.length + 1),
      sender: 'teacher',
      content: file.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'document',
      originalLanguage: 'English',
      fileUrl: URL.createObjectURL(file), // Create a temporary URL for the file
    };
    addMessage(newMessage);
  };

  const generateSummary = async (currentAttendance: AttendanceSchema) => {
    setIsGeneratingSummary(true);
    setSummary(null);
    try {
      const conversationToSummarize = messages.map(({ sender, content }) => ({ sender, content }));
      const result = await summarizeConversation({ 
        messages: conversationToSummarize,
        attendance: currentAttendance
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

  const handleUpdateAttendance = (newAttendance: AttendanceSchema) => {
    setAttendance(newAttendance);
    generateSummary(newAttendance);
  }

  const onTabChange = (tab: string) => {
    if (tab === 'summary' && !summary && !isGeneratingSummary) {
      generateSummary(attendance);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const layoutTitle = `Conversation with ${contact.name}`;
  const layoutUser = { name: teacher.name, avatarUrl: teacher.avatarUrl, role: 'Teacher' };

  return (
    <ChatPageLayout title={layoutTitle} user={layoutUser}>
      <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden" onValueChange={onTabChange}>
        <div className="flex justify-center p-2 border-b">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="summary">Progress Summary</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6" ref={scrollAreaRef}>
              {messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} currentUser="teacher" />
              ))}
          </div>
          <div className="p-4 md:p-6 pt-2 border-t bg-background">
              <MessageInput 
                onSendMessage={handleSendMessage} 
                onSendSms={handleSendSms}
                onSendVoice={handleSendVoice}
                onSendFile={handleSendFile}
               />
          </div>
        </TabsContent>
        <TabsContent value="summary" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            <div className="flex justify-end">
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
