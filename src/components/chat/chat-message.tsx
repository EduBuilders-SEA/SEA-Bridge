"use client";

import { Sparkles, Languages, FileText, Music4, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

type Message = {
  id: string;
  sender: 'teacher' | 'parent';
  content: string;
  timestamp: string;
  type: 'text' | 'document' | 'voice';
  originalLanguage?: string;
  translatedContent?: string;
  summarizedContent?: string;
  isTranslating?: boolean;
  isSummarizing?: boolean;
};

type ChatMessageProps = {
  message: Message;
  currentUser: 'teacher' | 'parent';
  onTranslate?: (id: string) => void;
  onSummarize?: (id: string) => void;
};

const AiActionButton = ({ isLoading, onClick, children }: { isLoading?: boolean; onClick: () => void; children: React.ReactNode }) => (
    <Button
        variant="ghost"
        size="sm"
        className="text-xs h-auto py-1 px-2 flex items-center gap-1 text-primary hover:bg-primary/10 hover:text-primary"
        onClick={onClick}
        disabled={isLoading}
    >
        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : children}
    </Button>
);

const MessageContent = ({ message }: { message: Message }) => {
    if (message.type === 'document') {
        return (
            <div className="flex items-center gap-2 p-3 bg-secondary rounded-md">
                <FileText className="w-6 h-6 text-primary" />
                <span className="font-medium font-body">{message.content}</span>
            </div>
        );
    }
    if (message.type === 'voice') {
        return (
            <div className="flex items-center gap-3 p-2 bg-secondary rounded-full w-fit">
                <div className="bg-primary text-primary-foreground rounded-full p-2">
                    <Music4 className="w-4 h-4" />
                </div>
                <div className="w-40 h-1 bg-muted-foreground/30 rounded-full relative">
                    <div className="absolute top-0 left-0 h-1 w-2/3 bg-primary rounded-full"></div>
                    <div className="absolute top-1/2 -right-1 h-3 w-3 bg-primary rounded-full -translate-y-1/2"></div>
                </div>
                <span className="text-xs font-mono text-muted-foreground">0:12</span>
            </div>
        )
    }
    return (
        <>
            <p className="font-body text-sm whitespace-pre-wrap">{message.content}</p>
            {message.translatedContent && (
                <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-bold text-primary mb-1 font-headline">Translation</p>
                    <p className="font-body text-sm text-primary/90">{message.translatedContent}</p>
                </div>
            )}
            {message.summarizedContent && (
                <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-bold text-primary mb-1 font-headline">Summary</p>
                    <p className="font-body text-sm text-primary/90">{message.summarizedContent}</p>
                </div>
            )}
        </>
    );
}

export default function ChatMessage({ message, currentUser, onTranslate, onSummarize }: ChatMessageProps) {
  const isSentByCurrentUser = message.sender === currentUser;

  const showAiActions = !isSentByCurrentUser && message.type === 'text' && onTranslate && onSummarize;

  return (
    <div className={cn('flex items-end gap-2', isSentByCurrentUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('w-full max-w-lg')}>
        <Card className={cn(
          'shadow-md transition-all',
          isSentByCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-card'
        )}>
          <CardContent className="p-3">
            <MessageContent message={message} />
          </CardContent>
          {!isSentByCurrentUser && (
            <CardFooter className="p-2 pt-0 flex justify-between items-center">
                <span className={cn(
                    "text-xs",
                    isSentByCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}>
                    {message.timestamp} {message.originalLanguage && `· ${message.originalLanguage}`}
                </span>
                {showAiActions && (
                    <div className="flex items-center gap-2">
                        <AiActionButton isLoading={message.isTranslating} onClick={() => onTranslate(message.id)}>
                            <Languages className="w-3 h-3" />
                            <span>Translate</span>
                        </AiActionButton>
                        <AiActionButton isLoading={message.isSummarizing} onClick={() => onSummarize(message.id)}>
                            <Sparkles className="w-3 h-3" />
                            <span>Summarize</span>
                        </AiActionButton>
                    </div>
                )}
            </CardFooter>
          )}
        </Card>
        {isSentByCurrentUser && (
             <p className="text-xs text-right text-muted-foreground mt-1 pr-2">{message.timestamp}</p>
        )}
      </div>
    </div>
  );
}
