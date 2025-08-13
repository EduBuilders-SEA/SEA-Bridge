"use client";

import { useState } from 'react';
import { Send, Paperclip, Mic, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type MessageInputProps = {
  onSendMessage: (content: string) => void;
  onSendSms?: (content: string) => void;
  placeholder?: string;
};

export default function MessageInput({ onSendMessage, onSendSms, placeholder }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  const handleSendSms = () => {
    if (text.trim() && onSendSms) {
      onSendSms(text);
      setText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <TooltipProvider>
      <div className="bg-card p-2 rounded-lg border flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-ring ring-offset-background ring-offset-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder || 'Type your message...'}
          className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[40px] h-10"
          rows={1}
        />
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary shrink-0">
          <Paperclip className="w-5 h-5" />
          <span className="sr-only">Attach file</span>
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary shrink-0">
          <Mic className="w-5 h-5" />
          <span className="sr-only">Record voice note</span>
        </Button>
        {onSendSms && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleSendSms} variant="ghost" size="icon" className="text-muted-foreground hover:text-primary shrink-0">
                <MessageSquareText className="w-5 h-5" />
                <span className="sr-only">Send as SMS</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Send as SMS</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Button onClick={handleSend} size="icon" className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
          <Send className="w-5 h-5" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </TooltipProvider>
  );
}
