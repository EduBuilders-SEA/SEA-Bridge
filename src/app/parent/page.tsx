"use client";

import { useState, useRef, useEffect } from 'react';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import MessageInput from '@/components/chat/message-input';
import ChatMessage from '@/components/chat/chat-message';
import { conversation, type Message } from '@/lib/data';
import { useToast } from "@/hooks/use-toast"

// These are server functions, but we can call them from the client
import { summarizeMessage } from '@/ai/flows/summarize-message';
import { translateMessage } from '@/ai/flows/translate-message';

const parent = {
  name: 'Mr. Chen',
  avatarUrl: 'https://placehold.co/100x100.png',
  role: 'Parent',
};

type DisplayMessage = Message & {
  translatedContent?: string;
  summarizedContent?: string;
  isTranslating?: boolean;
  isSummarizing?: boolean;
};

export default function ParentPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>(conversation);
  const [parentLanguage] = useState('Mandarin Chinese');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast()


  const handleSendMessage = (content: string) => {
    const newMessage: DisplayMessage = {
      id: String(messages.length + 1),
      sender: 'parent',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      originalLanguage: parentLanguage,
    };
    setMessages([...messages, newMessage]);
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
    <ChatPageLayout title="Conversation with Mrs. Davison" user={parent}>
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
