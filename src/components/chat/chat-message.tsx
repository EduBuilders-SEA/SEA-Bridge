
"use client";

import { Sparkles, Languages, FileText, Loader2, Quote, Volume2, Pause, Play, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useEffect, useRef, useState } from 'react';
import { Slider } from '../ui/slider';
import Image from 'next/image';

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
  audioDataUri?: string;
  summary?: string;
  isSummarizing?: boolean;
  fileUrl?: string;
};

type ChatMessageProps = {
  message: Message;
  currentUser: 'teacher' | 'parent';
  onSimplify?: (id: string) => void;
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

const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) {
        return "0:00";
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};


const VoiceNotePlayer = ({ audioDataUri, isSentByCurrentUser }: { audioDataUri: string, isSentByCurrentUser: boolean }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);

    useEffect(() => {
        const audio = audioRef.current;
        if (audio) {
            const setAudioData = () => {
                if (isFinite(audio.duration)) {
                  setDuration(audio.duration);
                }
            }

            const setAudioTime = () => setCurrentTime(audio.currentTime);

            audio.addEventListener('loadedmetadata', setAudioData);
            audio.addEventListener('timeupdate', setAudioTime);

            // If audio is already loaded
            if (audio.readyState >= 2) {
                setAudioData();
            }

            return () => {
                audio.removeEventListener('loadedmetadata', setAudioData);
                audio.removeEventListener('timeupdate', setAudioTime);
            }
        }
    }, []);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (audio) {
            if (isPlaying) {
                audio.pause();
            } else {
                audio.play();
            }
            setIsPlaying(!isPlaying);
        }
    };
    
    const handleSliderChange = (value: number[]) => {
        if(audioRef.current) {
            audioRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        if (audioRef.current) {
            audioRef.current.volume = value[0];
            setVolume(value[0]);
        }
    };

    const timeClass = isSentByCurrentUser ? 'text-primary-foreground/80' : 'text-card-foreground/80';

    return (
        <div className="flex items-center gap-3 p-2 rounded-md">
            <audio ref={audioRef} src={audioDataUri} preload="metadata" onEnded={() => setIsPlaying(false)} />
            <Button variant="ghost" size="icon" onClick={togglePlayPause} className="w-8 h-8 rounded-full flex-shrink-0">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <div className="flex-1 flex items-center gap-2">
                <span className={cn("text-xs font-mono w-9", timeClass)}>{formatTime(currentTime)}</span>
                <Slider
                    min={0}
                    max={duration || 1}
                    step={0.1}
                    value={[currentTime]}
                    onValueChange={handleSliderChange}
                    className="flex-1"
                />
                 <span className={cn("text-xs font-mono w-9", timeClass)}>{formatTime(duration)}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 w-24">
                <Volume2 className="w-4 h-4" />
                <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={[volume]}
                    onValueChange={handleVolumeChange}
                    className="flex-1"
                />
            </div>
        </div>
    )
}

const MessageContent = ({ message, isSentByCurrentUser }: { message: Message, isSentByCurrentUser: boolean }) => {
    if (message.type === 'document') {
        const isImage = message.content.match(/\.(jpeg|jpg|gif|png)$/) != null;
        const textColor = isSentByCurrentUser ? 'text-primary-foreground' : 'text-card-foreground';

        return (
            <div>
                 {isImage && message.fileUrl ? (
                    <a href={message.fileUrl} download={message.content} className="block relative aspect-video w-full rounded-md overflow-hidden group">
                        <Image src={message.fileUrl} alt={message.content} fill className="object-cover" />
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Download className="w-8 h-8 text-white" />
                        </div>
                    </a>
                ) : (
                    <a 
                        href={message.fileUrl} 
                        download={message.content}
                        className="flex items-center gap-3 p-3 bg-secondary rounded-md hover:bg-secondary/90 transition-colors"
                    >
                        <FileText className="w-6 h-6 text-primary flex-shrink-0" />
                        <div className="flex-1 overflow-hidden">
                            <p className={cn("font-medium font-body truncate", textColor)}>
                                {message.content}
                            </p>
                             <p className="text-xs text-muted-foreground">Click to download</p>
                        </div>
                        <Download className="w-5 h-5 text-muted-foreground" />
                    </a>
                )}
                 {(message.isSummarizing || message.summary) && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                        <p className={cn("text-xs font-bold mb-1 font-headline", 'text-primary')}>Summary</p>
                        {message.isSummarizing && !message.summary && (
                            <div className={cn("flex items-center gap-2", textColor + '/90' )}>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Summarizing...</span>
                            </div>
                        )}
                        {message.summary && <p className={cn("font-body text-sm whitespace-pre-wrap", textColor + '/90')}>{message.summary}</p>}
                    </div>
                )}
            </div>
        );
    }
    if (message.type === 'voice' && message.audioDataUri) {
        return (
             <div>
                <VoiceNotePlayer audioDataUri={message.audioDataUri} isSentByCurrentUser={isSentByCurrentUser} />
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
                        <p className={cn("font-body text-sm italic", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-card-foreground/90')}>"{message.transcription}"</p>
                    </div>
                )}
                 {(message.translatedContent) && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                        <p className={cn("text-xs font-bold mb-1 font-headline", isSentByCurrentUser ? 'text-primary-foreground' : 'text-primary' )}>Translation</p>
                        {message.isTranslating && !message.translatedContent && (
                            <div className={cn("flex items-center gap-2", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-card-foreground/90' )}>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Translating...</span>
                            </div>
                        )}
                        {message.translatedContent && <p className={cn("font-body text-sm", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-card-foreground/90')}>{message.translatedContent}</p>}
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
                        <div className={cn("flex items-center gap-2", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-card-foreground/90' )}>
                           <Loader2 className="w-4 h-4 animate-spin" />
                           <span className="text-sm">Translating...</span>
                        </div>
                    )}
                    {message.translatedContent && <p className={cn("font-body text-sm", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-card-foreground/90')}>{message.translatedContent}</p>}
                </div>
            )}
             {message.simplifiedContent && (
                <div className="mt-3 pt-3 border-t border-border/50">
                    <p className={cn("text-xs font-bold mb-1 font-headline", isSentByCurrentUser ? 'text-primary-foreground' : 'text-primary')}>Simplified Version</p>
                    <p className={cn("font-body text-sm", isSentByCurrentUser ? 'text-primary-foreground/90' : 'text-card-foreground/90')}>{message.simplifiedContent}</p>
                </div>
            )}
        </>
    );
}

export default function ChatMessage({ message, currentUser, onSimplify, onSummarize }: ChatMessageProps) {
  const isSentByCurrentUser = message.sender === currentUser;

  const showAIActions = !isSentByCurrentUser && (message.type === 'text' || message.type === 'document');
  const cardPadding = message.type === 'document' && message.content.match(/\.(jpeg|jpg|gif|png)$/) ? 'p-1' : 'p-3';


  return (
    <div className={cn('flex items-end gap-2', isSentByCurrentUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('w-full max-w-lg')}>
        <Card className={cn(
          'shadow-md transition-all',
          isSentByCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-card'
        )}>
          <CardContent className={cardPadding}>
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
                        {message.type === 'text' && onSimplify && !message.simplifiedContent && (
                            <AiActionButton isLoading={message.isSimplifying} onClick={() => onSimplify(message.id)}>
                                <Sparkles className="w-3 h-3" />
                                <span>Simplify</span>
                            </AiActionButton>
                        )}
                        {message.type === 'document' && onSummarize && !message.summary && (
                             <AiActionButton isLoading={message.isSummarizing} onClick={() => onSummarize(message.id)}>
                                <Sparkles className="w-3 h-3" />
                                <span>Summarize</span>
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
