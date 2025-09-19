'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLanguageStore } from '@/components/store/language-store';
import { useContacts } from '@/hooks/use-contacts';
import { useFileUpload } from '@/hooks/use-file-upload';
import { useCurrentProfile } from '@/hooks/use-profile';
import { useToast } from '@/hooks/use-toast';
import { useVoiceMessages } from '@/hooks/use-voice-messages';
import type { ChatMessage } from '@/lib/schemas';
import { MessageSquareText, Paperclip, Send } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { VoiceRecorder } from './voice-recorder';
import type { SupabaseChannel } from '@/lib/supabase/types';

type MessageInputProps = {
  contactId: string;
  onSendMessage: (content: string) => Promise<ChatMessage | null | void>;
  onSendSms?: (content: string) => Promise<ChatMessage | null | void>;
  onSendFile?: (file: File) => Promise<ChatMessage | null | void>;
  placeholder?: string;
  channel: SupabaseChannel
};

export default function MessageInput({
  contactId,
  onSendMessage,
  onSendSms,
  onSendFile,
  placeholder,
  channel
}: MessageInputProps) {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { uploadFileAsync, isUploading } = useFileUpload();
  const { data: profile } = useCurrentProfile();
  const { contacts } = useContacts();
  const { selectedLanguage } = useLanguageStore();
  const { sendVoice, isSending } = useVoiceMessages(contactId, channel);

  // Get contact info to determine target language
  const contact = contacts?.find((c) => c.id === contactId);

  const handleSend = async () => {
    if (text.trim()) {
      await onSendMessage(text);
      setText('');
    }
  };

  const handleSendSms = async () => {
    if (text.trim() && onSendSms) {
      await onSendSms(text);
      setText('');
    }
  };

  // Voice message handler using the mutation from useVoiceMessages
  const handleSendVoice = async (audioDataUri: string) => {
    if (!contact || !profile) return;

    // Use the user's selected language from the language store
    const targetLanguage = selectedLanguage || 'English'; // Fallback to English if no language selected

    try {
      sendVoice({
        audioDataUri,
        targetLanguage,
      });
    } catch (error) {
      console.error('Failed to send voice message:', error);
      toast({
        title: 'Failed to send voice message',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Upload file to Supabase Storage
      const uploadResult = await uploadFileAsync(file);

      // Send file message with the uploaded URL
      if (onSendFile) {
        // Create a modified file object with the uploaded URL
        const fileWithUrl = new File([file], file.name, { type: file.type });
        // Add the URL as a property (this is a hack, but works for our use case)
        (fileWithUrl as any).uploadedUrl = uploadResult.signedUrl ?? uploadResult.path;
        
        await onSendFile(fileWithUrl);
      }
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
      <div className='space-y-2'>
        <div className='bg-card p-2 rounded-lg border flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-ring ring-offset-background ring-offset-2'>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder ?? 'Type your message...'}
            className='flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none min-h-[40px] h-10'
            rows={1}
            disabled={isSending}
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

          {/* Voice Recorder Component - Inline */}
          <VoiceRecorder onSendVoice={handleSendVoice} disabled={isSending} />

          <Button
            onClick={handleSend}
            size='icon'
            className='bg-accent hover:bg-accent/90 text-accent-foreground shrink-0'
            disabled={isSending}
          >
            <Send className='w-5 h-5' />
            <span className='sr-only'>Send</span>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
