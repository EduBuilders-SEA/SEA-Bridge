"use client";

import { Sparkles, Languages, FileText, Music4, Loader2, Quote, Volume2, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useEffect, useRef, useState } from 'react';
import { Slider } from '../ui/slider';

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
                setDuration(audio.duration);
                setCurrentTime(audio.currentTime);
            }

            const setAudioTime = () => setCurrentTime(audio.currentTime);

            audio.addEventListener('loadeddata', setAudioData);
            audio.addEventListener('timeupdate', setAudioTime);

            return () => {
                audio.removeEventListener('loadeddata', setAudioData);
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

    const timeClass = isSentByCurrentUser ? 'text-primary-foreground/80' : 'text-muted-foreground';

    return (
        <div className="flex items-center gap-3 p-3 bg-card/80 rounded-md">
            <audio ref={audioRef} src={audioDataUri} preload="metadata" onEnded={() => setIsPlaying(false)} />
            <Button variant="ghost" size="icon" onClick={togglePlayPause} className="w-8 h-8 rounded-full">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <div className="flex-1 flex items-center gap-2">
                <span className={cn("text-xs font-mono", timeClass)}>{formatTime(currentTime)}</span>
                <Slider
                    min={0}
                    max={duration}
                    step={0.1}
                    value={[currentTime]}
                    onValueChange={handleSliderChange}
                    className="flex-1"
                />
                 <span className={cn("text-xs font-mono", timeClass)}>{formatTime(duration)}</span>
            </div>
            <div className="flex items-center gap-2 w-24">
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
        return (
            <div className="flex items-center gap-2 p-3 bg-secondary rounded-md">
                <FileText className="w-6 h-6 text-primary" />
                <span className="font-medium font-body text-card-foreground">{message.content}</span>
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
