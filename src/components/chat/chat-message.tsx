"use client";

import { Sparkles, Languages, FileText, Music4, Loader2, Quote } from 'lucide-react';
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
  isTranslating?: boolean;
  simplifiedContent?: string;
  isSimplifying?: boolean;
  transcription?: string;
  isTranscribing?: boolean;
};

type ChatMessageProps = {
  message: Message;
  currentUser: 'teacher' | 'parent';
  onTranslate?: (id: string) => void;
  onSimplify?: (id: string) => void;
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

const MessageContent = ({ message, isSentByCurrentUser }: { message: Message, isSentByCurrentUser: boolean }) => {
    if (message.type === 'document') {
        return (
            <div className="flex items-center gap-2 p-3 bg-secondary rounded-md">
                <FileText className="w-6 h-6 text-primary" />
                <span className="font-medium font-body text-card-foreground">{message.content}</span>
            </div>
        );
    }
    if (message.type === 'voice') {
        return (
             <div>
                <div className={cn(
                  "flex items-center gap-3 p-2 rounded-full w-fit",
                  isSentByCurrentUser ? 'bg-primary-foreground/20' : 'bg-secondary'
                )}>
                    <div className={cn(
                        "rounded-full p-2",
                        isSentByCurrentUser ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground'
                    )}>
                        <Music4 className="w-4 h-4" />
                    </div>
                    <div className={cn(
                        "w-40 h-1 rounded-full relative",
                        isSentByCurrentUser ? 'bg-primary-foreground/30' : 'bg-muted-foreground/30'
                    )}>
                        <div className={cn(
                          "absolute top-0 left-0 h-1 w-2/3 rounded-full",
                          isSentByCurrentUser ? 'bg-primary-foreground' : 'bg-primary'
                        )}></div>
                        <div className={cn(
                          "absolute top-1/2 -right-1 h-3 w-3 rounded-full -translate-y-1/2",
                          isSentByCurrentUser ? 'bg-primary-foreground' : 'bg-primary'
                        )}></div>
                    </div>
                    <span className={cn(
                        "text-xs font-mono",
                        isSentByCurrentUser ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}>0:12</span>
                </div>
                {message.isTranscribing && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                         <div className={cn("flex items-center gap-2", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-primary/90' )}>
                           <Loader2 className="w-4 h-4 animate-spin" />
                           <span className="text-sm">Processing audio...</span>
                        </div>
                    </div>
                )}
                {message.transcription && (
                     <div className="mt-3 pt-3 border-t border-border/50">
                        <p className={cn("text-xs font-bold mb-1 font-headline flex items-center gap-1.5", isSentByCurrentUser ? 'text-primary-foreground' : 'text-primary' )}><Quote className="w-4 h-4" /> Transcription</p>
                        <p className={cn("font-body text-sm italic", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-primary/90')}>"{message.transcription}"</p>
                    </div>
                )}
                 {(message.translatedContent) && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                        <p className={cn("text-xs font-bold mb-1 font-headline", isSentByCurrentUser ? 'text-primary-foreground' : 'text-primary' )}>Translation</p>
                        {message.isTranslating && !message.translatedContent && (
                            <div className={cn("flex items-center gap-2", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-primary/90' )}>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Translating...</span>
                            </div>
                        )}
                        {message.translatedContent && <p className={cn("font-body text-sm", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-primary/90')}>{message.translatedContent}</p>}
                    </div>
                )}
             </div>
        )
    }
    return (
        <>
            <p className="font-body text-sm whitespace-pre-wrap">{message.content}</p>
            {(message.isTranslating || message.translatedContent) && (
                <div className="mt-3 pt-3 border-t border-border/50">
                    <p className={cn("text-xs font-bold mb-1 font-headline", isSentByCurrentUser ? 'text-primary-foreground' : 'text-primary')}>Translation</p>
                    {message.isTranslating && !message.translatedContent && (
                        <div className={cn("flex items-center gap-2", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-primary/90' )}>
                           <Loader2 className="w-4 h-4 animate-spin" />
                           <span className="text-sm">Translating...</span>
                        </div>
                    )}
                    {message.translatedContent && <p className={cn("font-body text-sm", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-primary/90')}>{message.translatedContent}</p>}
                </div>
            )}
             {message.simplifiedContent && (
                <div className="mt-3 pt-3 border-t border-border/50">
                    <p className={cn("text-xs font-bold mb-1 font-headline", isSentByCurrentUser ? 'text-primary-foreground' : 'text-primary')}>Simplified Version</p>
                    <p className={cn("font-body text-sm", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-primary/90')}>{message.simplifiedContent}</p>
                </div>
            )}
        </>
    );
}

export default function ChatMessage({ message, currentUser, onTranslate, onSimplify }: ChatMessageProps) {
  const isSentByCurrentUser = message.sender === currentUser;

  const showAIActions = !isSentByCurrentUser && message.type === 'text';

  return (
    <div className={cn('flex items-end gap-2', isSentByCurrentUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('w-full max-w-lg')}>
        <Card className={cn(
          'shadow-md transition-all',
          isSentByCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-card'
        )}>
          <CardContent className="p-3">
            <MessageContent message={message} isSentByCurrentUser={isSentByCurrentUser} />
          </CardContent>
          {!isSentByCurrentUser && (
            <CardFooter className="p-2 pt-0 flex justify-between items-center">
                <span className={cn(
                    "text-xs",
                    isSentByCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}>
                    {message.timestamp} {message.originalLanguage && `· ${message.originalLanguage}`}
                </span>
                {showAIActions && (
                    <div className="flex items-center gap-2">
                        {onSimplify && (
                            <AiActionButton isLoading={message.isSimplifying} onClick={() => onSimplify(message.id)}>
                                <Sparkles className="w-3 h-3" />
                                <span>Simplify</span>
                            </AiActionButton>
                        )}
                        {onTranslate && (
                            <AiActionButton isLoading={message.isTranslating} onClick={() => onTranslate(message.id)}>
                                <Languages className="w-3 h-3" />
                                <span>Translate</span>
                            </AiActionButton>
                        )}
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
