"use client";

import { useState, useRef, useEffect } from 'react';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import MessageInput from '@/components/chat/message-input';
import ChatMessage from '@/components/chat/chat-message';
import { conversation, type Message } from '@/lib/data';
import { useToast } from "@/hooks/use-toast"
import { notFound } from 'next/navigation';

// These are server functions, but we can call them from the client
import { summarizeMessage } from '@/ai/flows/summarize-message';
import { translateMessage } from '@/ai/flows/translate-message';
import { sendSms } from '@/ai/flows/send-sms';
import { contacts } from '@/lib/contacts';

type DisplayMessage = Message & {
  translatedContent?: string;
  summarizedContent?: string;
  isTranslating?: boolean;
  isSummarizing?: boolean;
};

export default function ParentChatPage({ params }: { params: { contactId: string } }) {
  const [messages, setMessages] = useState<DisplayMessage[]>(conversation);
  const [parentLanguage] = useState('Mandarin Chinese');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast()

  const contact = contacts.find(c => c.id === params.contactId && c.role === 'teacher');
  
  if (!contact) {
    notFound();
  }

  const parent = {
    name: 'Mr. Chen',
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

  const handleSendSms = async (content: string) => {
    if (!content.trim()) return;

    try {
      const result = await sendSms({
        phoneNumber: contact.phoneNumber,
        message: content,
        senderRole: 'parent',
      });
      
      const newMessage: DisplayMessage = {
        id: String(messages.length + 1),
        sender: 'parent',
        content: `${content}\n(Sent via SMS)`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
        originalLanguage: parentLanguage,
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


  const handleTranslate = async (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isTranslating: true } : m));
    const messageToTranslate = messages.find(m => m.id === messageId);
    if (messageToTranslate) {
      try {
        const result = await translateMessage({ message: messageToTranslate.content, targetLanguage: parentLanguage });
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, translatedContent: result.translatedMessage, isTranslating: false } : m));
      } catch (error) {
        console.error("Translation failed", error);
        toast({
          variant: "destructive",
          title: "Translation Failed",
          description: "Could not translate the message at this time.",
        })
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isTranslating: false } : m));
      }
    }
  };

  const handleSummarize = async (messageId: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isSummarizing: true } : m));
    const messageToSummarize = messages.find(m => m.id === messageId);
    if (messageToSummarize) {
      try {
        const contentToSummarize = messageToSummarize.translatedContent || messageToSummarize.content;
        const result = await summarizeMessage({ message: contentToSummarize, language: parentLanguage });
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, summarizedContent: result.summary, isSummarizing: false } : m));
      } catch (error) {
        console.error("Summarization failed", error);
        toast({
          variant: "destructive",
          title: "Summarization Failed",
          description: "Could not summarize the message at this time.",
        })
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isSummarizing: false } : m));
      }
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ChatPageLayout title={`Conversation with ${contact.name}`} user={parent}>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6" ref={scrollAreaRef}>
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            currentUser="parent"
            onTranslate={handleTranslate}
            onSummarize={handleSummarize}
          />
        ))}
      </div>
      <div className="p-4 md:p-6 pt-2 border-t bg-background">
        <MessageInput onSendMessage={handleSendMessage} onSendSms={handleSendSms} placeholder={`Reply in ${parentLanguage}...`} />
      </div>
    </ChatPageLayout>
  );
}
