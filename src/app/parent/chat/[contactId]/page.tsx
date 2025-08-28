
"use client";

import { useState, useRef, useEffect } from 'react';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import MessageInput from '@/components/chat/message-input';
import ChatMessage from '@/components/chat/chat-message';
import { conversation, type Message } from '@/lib/data';
import { useToast } from "@/hooks/use-toast"
import { notFound, useSearchParams, useRouter } from 'next/navigation';
import { contacts } from '@/lib/contacts';

type DisplayMessage = Message & {
  translatedContent?: string;
  summarizedContent?: string;
  isTranslating?: boolean;
  isSummarizing?: boolean;
};

export default function ParentChatPage({ params: { contactId } }: { params: { contactId: string } }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = searchParams.get('lang');
  const [parentName, setParentName] = useState('Parent');

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

  const handleSummarize = async (messageId: string) => {
    // Placeholder logic, real implementation removed
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isSummarizing: true } : m));
     console.log(`Summarizing message ${messageId}`);
    setTimeout(() => {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isSummarizing: false, summarizedContent: `[Summary for: ${m.content}]` } : m));
    }, 1000);
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
        <MessageInput onSendMessage={handleSendMessage} placeholder={`Reply in ${parentLanguage}...`} />
      </div>
    </ChatPageLayout>
  );
}
