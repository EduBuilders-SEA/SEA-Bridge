"use client";

import { useState, useRef, useEffect } from 'react';
import ChatPageLayout from '@/components/chat/chat-page-layout';
import MessageInput from '@/components/chat/message-input';
import ChatMessage from '@/components/chat/chat-message';
import { conversation, type Message } from '@/lib/data';

const teacher = {
  name: 'Mrs. Davison',
  avatarUrl: 'https://placehold.co/100x100.png',
  role: 'Teacher',
};

export default function TeacherPage() {
  const [messages, setMessages] = useState<Message[]>(conversation);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = (content: string) => {
    const newMessage: Message = {
      id: String(messages.length + 1),
      sender: 'teacher',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      originalLanguage: 'English',
    };
    setMessages([...messages, newMessage]);
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ChatPageLayout title="Conversation with Chen's Parents" user={teacher}>
        <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6" ref={scrollAreaRef}>
            {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} currentUser="teacher" />
            ))}
        </div>
        <div className="p-4 md:p-6 pt-2 border-t bg-background">
            <MessageInput onSendMessage={handleSendMessage} />
        </div>
    </ChatPageLayout>
  );
}
