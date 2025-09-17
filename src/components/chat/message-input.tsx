'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMessagePersistence } from '@/hooks/use-message-persistence';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/schemas';
import {
  MessageSquareText,
  Mic,
  Paperclip,
  Send,
  StopCircle,
} from 'lucide-react';
import React, { useRef, useState } from 'react';

type MessageInputProps = {
  contactId: string;
  onSendMessage: (content: string) => Promise<ChatMessage | null | void>;
  onSendSms?: (content: string) => Promise<ChatMessage | null | void>;
  onSendVoice?: (audioDataUri: string) => Promise<ChatMessage | null | void>;
  onSendFile?: (file: File) => Promise<ChatMessage | null | void>;
  placeholder?: string;
};

export default function MessageInput({
  contactId,
  onSendMessage,
  onSendSms,
  onSendVoice,
  onSendFile,
  placeholder,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { persistMessage } = useMessagePersistence();
  const { uploadFileAsync, isUploading } = useFileUpload();

  const handleSend = async () => {
    if (text.trim()) {
      const sent = await onSendMessage(text);

      persistMessage({
        id: sent?.id,
        sent_at: sent?.sent_at,
        content: text,
        message_type: 'text',
        contact_link_id: contactId,
      });

      setText('');
    }
  };

  const handleSendSms = async () => {
    if (text.trim() && onSendSms) {
      const sent = await onSendSms(text);

      persistMessage({
        id: sent?.id,
        sent_at: sent?.sent_at,
        content: `[SMS] ${text}`,
        message_type: 'text',
        contact_link_id: contactId,
      });

      setText('');
    }
  };

  const handleStartRecording = async () => {
    if (isRecording || !onSendVoice) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const audioDataUri = reader.result as string;

          const sent = onSendVoice ? await onSendVoice(audioDataUri) : undefined;

          persistMessage({
            id: sent?.id,
            sent_at: sent?.sent_at,
            content: 'Voice note',
            message_type: 'voice',
            contact_link_id: contactId,
            file_url: audioDataUri,
          });
        };

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        variant: 'destructive',
        title: 'Microphone Access Denied',
        description:
          'Please enable microphone permissions in your browser settings.',
      });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleVoiceClick = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Upload file to Supabase Storage
      const uploadResult = await uploadFileAsync(file);
      
      // Send file message if onSendFile is provided
      const sent = onSendFile ? await onSendFile(file) : null;

      // Persist message with correct type 'file' 
      persistMessage({
        id: sent?.id,
        sent_at: sent?.sent_at,
        content: `📎 ${file.name}`,
        message_type: 'file', // Changed from 'document' to 'file'
        contact_link_id: contactId,
        file_url: uploadResult.signedUrl ?? uploadResult.path,
      });
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'Failed to upload file. Please try again.',
      });
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      <div className='bg-card p-2 rounded-lg border flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-ring ring-offset-background ring-offset-2'>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder ?? 'Type your message...'}
          className='flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[40px] h-10'
          rows={1}
          disabled={isRecording}
        />
        <input
          type='file'
          ref={fileInputRef}
          onChange={handleFileChange}
          className='hidden'
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='text-muted-foreground hover:text-primary shrink-0'
              onClick={() => fileInputRef.current?.click()}
              disabled={!onSendFile || isUploading}
            >
              <Paperclip className='w-5 h-5' />
              <span className='sr-only'>Attach file</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Attach file</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleVoiceClick}
              variant='ghost'
              size='icon'
              className={cn(
                'text-muted-foreground hover:text-primary shrink-0',
                isRecording && 'text-red-500 hover:text-red-600'
              )}
            >
              {isRecording ? (
                <StopCircle className='w-5 h-5 animate-pulse' />
              ) : (
                <Mic className='w-5 h-5' />
              )}
              <span className='sr-only'>
                {isRecording ? 'Stop recording' : 'Record voice note'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isRecording ? 'Stop recording' : 'Send voice note'}</p>
          </TooltipContent>
        </Tooltip>
        {onSendSms && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleSendSms}
                variant='ghost'
                size='icon'
                className='text-muted-foreground hover:text-primary shrink-0'
              >
                <MessageSquareText className='w-5 h-5' />
                <span className='sr-only'>Send as SMS</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Send as SMS</p>
            </TooltipContent>
          </Tooltip>
        )}
        <Button
          onClick={handleSend}
          size='icon'
          className='bg-accent hover:bg-accent/90 text-accent-foreground shrink-0'
          disabled={isRecording}
        >
          <Send className='w-5 h-5' />
          <span className='sr-only'>Send</span>
        </Button>
      </div>
    </TooltipProvider>
  );
}
