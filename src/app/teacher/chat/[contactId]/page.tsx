
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
import { ProgressSummaryCard } from '@/components/chat/progress-summary-card';
import { Card, CardContent } from '@/components/ui/card';


export default function TeacherChatPage({ params: { contactId } }: { params: { contactId: string } }) {
  const [messages, setMessages] = useState<Message[]>(conversation);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [teacherName, setTeacherName] = useState('Teacher');
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

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  }

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: String(messages.length + 1),
      sender: 'teacher',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      originalLanguage: 'English',
    };
    addMessage(newMessage);
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
      <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
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
              <MessageInput onSendMessage={handleSendMessage} />
          </div>
        </TabsContent>
        <TabsContent value="summary" className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="flex justify-end mb-4">
                 {/* Placeholder for Date Range Picker */}
                <Card className="p-2"><CardContent className="p-0">Date Range Picker Coming Soon</CardContent></Card>
            </div>
            <ProgressSummaryCard studentName={contact.childName} />
        </TabsContent>
      </Tabs>
    </ChatPageLayout>
  );
}

    