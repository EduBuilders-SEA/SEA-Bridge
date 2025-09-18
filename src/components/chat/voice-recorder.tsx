'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Mic, Send, Square, Trash2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

interface VoiceRecorderProps {
  onSendVoice: (audioDataUri: string) => void;
  disabled?: boolean;
}

export const VoiceRecorder = ({
  onSendVoice,
  disabled = false,
}: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudio(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        // Clean up stream
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [isRecording]);

  const sendRecording = useCallback(() => {
    if (recordedAudio) {
      onSendVoice(recordedAudio);
      setRecordedAudio(null);
      setRecordingTime(0);
    }
  }, [recordedAudio, onSendVoice]);

  const discardRecording = useCallback(() => {
    setRecordedAudio(null);
    setRecordingTime(0);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (recordedAudio) {
    return (
      <div className='flex items-center gap-2 p-2 bg-muted rounded-md'>
        <audio src={recordedAudio} controls className='flex-1 h-8' />
        <Button size='sm' onClick={sendRecording} disabled={disabled}>
          <Send className='w-4 h-4' />
        </Button>
        <Button size='sm' variant='outline' onClick={discardRecording}>
          <Trash2 className='w-4 h-4' />
        </Button>
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      {isRecording && (
        <span className='text-sm text-red-500 font-mono animate-pulse'>
          {formatTime(recordingTime)}
        </span>
      )}
      <Button
        size='icon'
        variant={isRecording ? 'destructive' : 'outline'}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className={cn(
          'transition-all duration-200',
          isRecording && 'animate-pulse scale-110'
        )}
      >
        {isRecording ? (
          <Square className='w-4 h-4' />
        ) : (
          <Mic className='w-4 h-4' />
        )}
      </Button>
    </div>
  );
};
