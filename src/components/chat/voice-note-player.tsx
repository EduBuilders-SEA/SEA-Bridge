'use client';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { FileText, Loader2, Pause, Play, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface VoiceNotePlayerProps {
  audioDataUri: string;
  transcription?: string;
  translatedContent?: string;
  isTranscribing?: boolean;
  isSentByCurrentUser: boolean;
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const VoiceNotePlayer = ({
  audioDataUri,
  transcription,
  translatedContent,
  isTranscribing = false,
  isSentByCurrentUser,
}: VoiceNotePlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const setAudioData = () => {
        if (isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      const setAudioTime = () => setCurrentTime(audio.currentTime);

      audio.addEventListener('loadedmetadata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);

      if (audio.readyState >= 2) {
        setAudioData();
      }

      return () => {
        audio.removeEventListener('loadedmetadata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
      };
    }
  }, [audioDataUri]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (audio && audioDataUri) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current) {
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

  const timeClass = isSentByCurrentUser
    ? 'text-primary-foreground/80'
    : 'text-card-foreground/80';

  if (!audioDataUri) {
    return (
      <div className='p-3 text-center text-muted-foreground'>
        <span className='text-sm'>Voice note unavailable</span>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {/* Audio Player */}
      <div className='flex items-center gap-3 p-2 rounded-md'>
        <audio
          ref={audioRef}
          src={audioDataUri}
          preload='metadata'
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        <Button
          variant='ghost'
          size='icon'
          onClick={togglePlayPause}
          className='w-8 h-8 rounded-full flex-shrink-0'
          disabled={!audioDataUri}
        >
          {isPlaying ? (
            <Pause className='w-4 h-4' />
          ) : (
            <Play className='w-4 h-4' />
          )}
        </Button>

        <div className='flex-1 flex items-center gap-2'>
          <span className={cn('text-xs font-mono w-9', timeClass)}>
            {formatTime(currentTime)}
          </span>
          <Slider
            min={0}
            max={duration || 1}
            step={0.1}
            value={[currentTime]}
            onValueChange={handleSliderChange}
            className='flex-1'
            disabled={!audioDataUri}
          />
          <span className={cn('text-xs font-mono w-9', timeClass)}>
            {formatTime(duration)}
          </span>
        </div>

        <div className='hidden sm:flex items-center gap-2 w-24'>
          <Volume2 className='w-4 h-4' />
          <Slider
            min={0}
            max={1}
            step={0.1}
            value={[volume]}
            onValueChange={handleVolumeChange}
            className='flex-1'
          />
        </div>

        {(transcription ?? translatedContent ?? isTranscribing) && (
          <Collapsible open={showTranscript} onOpenChange={setShowTranscript}>
            <CollapsibleTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='w-8 h-8 rounded-full flex-shrink-0'
              >
                <FileText className='w-4 h-4' />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        )}
      </div>

      {/* Transcript Section */}
      {(transcription ?? translatedContent ?? isTranscribing) && (
        <Collapsible open={showTranscript} onOpenChange={setShowTranscript}>
          <CollapsibleContent className='space-y-2'>
            {isTranscribing && (
              <div className='flex items-center gap-2 p-2 text-sm text-muted-foreground italic bg-muted/30 rounded'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span>Processing voice note...</span>
              </div>
            )}

            {transcription && (
              <div className='p-3 text-sm bg-muted/50 rounded'>
                <div className='font-medium text-xs text-muted-foreground mb-2'>
                  Transcription:
                </div>
                <p className='whitespace-pre-wrap'>{transcription}</p>
              </div>
            )}

            {translatedContent && (
              <div className='p-3 text-sm bg-muted/30 rounded'>
                <div className='font-medium text-xs text-muted-foreground mb-2'>
                  Translation:
                </div>
                <p className='whitespace-pre-wrap'>{translatedContent}</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
