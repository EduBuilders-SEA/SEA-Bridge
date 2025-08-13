"use client";

import { useState, useRef, useEffect } from 'react';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import MessageInput from '@/components/chat/message-input';
import ChatMessage from '@/components/chat/chat-message';
import { conversation, type Message } from '@/lib/data';
import { useToast } from "@/hooks/use-toast"
import { sendSms } from '@/ai/flows/send-sms';
import { contacts } from '@/lib/contacts';
import { notFound } from 'next/navigation';


export default function TeacherChatPage({ params }: { params: { contactId: string } }) {
  const [messages, setMessages] = useState<Message[]>(conversation);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const contact = contacts.find(c => c.id === params.contactId && c.role === 'parent');
  
  if (!contact) {
    notFound();
  }

  const teacher = {
    name: 'Mrs. Davison',
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

  const handleSendSms = async (content: string) => {
    if (!content.trim()) return;

    try {
      const result = await sendSms({
        phoneNumber: contact.phoneNumber,
        message: content,
        senderRole: 'teacher',
      });
      
      const newMessage: Message = {
        id: String(messages.length + 1),
        sender: 'teacher',
        content: `${content}\n(Sent via SMS)`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
        originalLanguage: 'English',
      };
      addMessage(newMessage);

      toast({
        title: "Message Sent via SMS",
        description: result.status,
      });

    } catch (error) {
      console.error("SMS failed", error);
      toast({
        variant: "destructive",
        title: "SMS Failed",
        description: "Could not send the SMS at this time.",
      });
    }
  };


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ChatPageLayout title={`Conversation with ${contact.name}`} user={teacher}>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6" ref={scrollAreaRef}>
            {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} currentUser="teacher" />
            ))}
        </div>
        <div className="p-4 md:p-6 pt-2 border-t bg-background">
            <MessageInput onSendMessage={handleSendMessage} onSendSms={handleSendSms} />
        </div>
    </ChatPageLayout>
  );
}
