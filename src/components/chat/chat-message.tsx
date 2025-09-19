'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMessageDelete } from '@/hooks/use-message-delete';
import { useMessageEdit } from '@/hooks/use-message-edit';
import type { ChatMessage as ChatMessageType } from '@/lib/schemas';
import type { SupabaseChannel } from '@/lib/supabase/types';
import { cn, formatMessageTime } from '@/lib/utils';
import {
  Download,
  Edit3,
  FileText,
  Globe,
  Loader2,
  MoreHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

type ChatMessageProps = {
  message: ChatMessageType;
  currentUserId: string;
  contactId: string;
  isTranslating?: boolean;
  onSimplify?: (id: string) => void;
  onSummarize?: (id: string) => void;
  channel: SupabaseChannel;
  isNewMessage?: boolean;
};

import React from 'react';
import { AWSDocumentTranslator } from './aws-document-translator';
import { VoiceNotePlayer } from './voice-note-player';

interface MessageTranslationStatusProps {
  isTranslating: boolean;
  translationModel?: 'sea-lion' | 'gemini' | 'hybrid';
  originalLanguage?: string;
  translatedLanguage?: string;
}

function MessageTranslationStatus({
  isTranslating,
  translationModel,
  originalLanguage,
  translatedLanguage,
}: MessageTranslationStatusProps) {
  if (isTranslating) {
    return (
      <div className='flex items-center gap-2 text-xs text-muted-foreground mt-1'>
        <Loader2 className='w-3 h-3 animate-spin' />
        <span>Translating with Sea-Lion...</span>
      </div>
    );
  }

  if (translationModel) {
    return (
      <div className='flex items-center gap-2 mt-1'>
        <Badge variant='outline' className='text-xs py-0 h-5'>
          {translationModel === 'sea-lion' ? (
            <>🦁 Sea-Lion</>
          ) : translationModel === 'gemini' ? (
            <>✨ Gemini</>
          ) : (
            <>🦁✨ Hybrid</>
          )}
        </Badge>
        {originalLanguage && translatedLanguage && (
          <span className='text-xs text-muted-foreground'>
            {originalLanguage} → {translatedLanguage}
          </span>
        )}
      </div>
    );
  }

  return null;
}

const AiActionButton = ({
  isLoading,
  onClick,
  children,
}: {
  isLoading?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Button
    variant='ghost'
    size='sm'
    className='text-xs h-auto py-1 px-2 flex items-center gap-1 text-primary hover:bg-primary/10 hover:text-primary'
    onClick={onClick}
    disabled={isLoading}
  >
    {isLoading ? <Loader2 className='w-3 h-3 animate-spin' /> : children}
  </Button>
);

const MessageContent = ({
  message,
  isSentByCurrentUser,
  isTranslating = false,
  currentUserId,
}: {
  message: ChatMessageType;
  isSentByCurrentUser: boolean;
  isTranslating?: boolean;
  currentUserId: string;
}) => {
  // All hooks must be at the top before any conditional returns
  const [displayMode, setDisplayMode] = useState<
    'translated' | 'original' | 'both'
  >('translated');

  if (message.message_type === 'image') {
    const isImage =
      message.file_url &&
      message.content.match(/\.(jpeg|jpg|gif|png)$/i) != null;

    return (
      <div>
        {isImage && message.file_url ? (
          <a
            href={message.file_url}
            download={message.content}
            className='block relative aspect-video w-full rounded-md overflow-hidden group'
          >
            <Image
              src={message.file_url}
              alt={message.content}
              fill
              className='object-cover'
            />
            <div className='absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
              <Download className='w-8 h-8 text-white' />
            </div>
          </a>
        ) : (
          <div
            className={cn(
              'p-3 rounded-md',
              isSentByCurrentUser ? 'bg-primary-foreground/10' : 'bg-muted'
            )}
          >
            <div className='flex items-center gap-3 mb-3'>
              <FileText className='w-6 h-6 text-primary flex-shrink-0' />
              <div className='flex-1 overflow-hidden'>
                <p
                  className={cn(
                    'font-medium font-body truncate',
                    isSentByCurrentUser
                      ? 'text-primary-foreground'
                      : 'text-card-foreground'
                  )}
                >
                  {message.content}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    isSentByCurrentUser
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground'
                  )}
                >
                  Click to download or translate
                </p>
              </div>
            </div>
            {message.file_url && (
              <AWSDocumentTranslator
                fileUrl={message.file_url}
                fileName={message.content}
                contactId={message.contact_link_id}
                messageId={message.id}
                variants={message.variants ?? undefined}
                isOwnMessage={message.sender_id === currentUserId}
              />
            )}
          </div>
        )}
        {(message.variants?.isSummarizing ?? message.variants?.summary) && (
          <div className='mt-3 pt-3 border-t border-border/50'>
            <p
              className={cn(
                'text-xs font-bold mb-1 font-headline',
                'text-primary'
              )}
            >
              Summary
            </p>
            {message.variants?.isSummarizing && !message.variants?.summary && (
              <div className='flex items-center gap-2 text-card-foreground/90'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span className='text-sm'>Summarizing...</span>
              </div>
            )}
            {message.variants?.summary && (
              <p
                className={cn(
                  'font-body text-sm whitespace-pre-wrap',
                  'text-card-foreground/90'
                )}
              >
                {message.variants.summary}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Handle file message type (documents)
  if (message.message_type === 'file') {
    return (
      <div>
        <div
          className={cn(
            'p-3 rounded-md',
            isSentByCurrentUser ? 'bg-primary-foreground/10' : 'bg-muted'
          )}
        >
          <div className='flex items-center gap-3 mb-3'>
            <FileText className='w-6 h-6 text-primary flex-shrink-0' />
            <div className='flex-1 overflow-hidden'>
              <p
                className={cn(
                  'font-medium font-body truncate',
                  isSentByCurrentUser
                    ? 'text-primary-foreground'
                    : 'text-card-foreground'
                )}
              >
                {message.content}
              </p>
              <p
                className={cn(
                  'text-xs',
                  isSentByCurrentUser
                    ? 'text-primary-foreground/80'
                    : 'text-muted-foreground'
                )}
              >
                Click to download or translate
              </p>
            </div>
          </div>
          {/* Always show AWSDocumentTranslator for file messages, even without file_url */}
          <AWSDocumentTranslator
            fileUrl={message.file_url ?? message.content} // Fallback to content if no URL
            fileName={message.content}
            contactId={message.contact_link_id}
            messageId={message.id}
            variants={message.variants ?? undefined}
            isOwnMessage={message.sender_id === currentUserId}
          />
        </div>
        {(message.variants?.isSummarizing ?? message.variants?.summary) && (
          <div className='mt-3 pt-3 border-t border-border/50'>
            <p
              className={cn(
                'text-xs font-bold mb-1 font-headline',
                'text-primary'
              )}
            >
              Summary
            </p>
            {message.variants?.isSummarizing && !message.variants?.summary && (
              <div className='flex items-center gap-2 text-card-foreground/90'>
                <Loader2 className='w-4 h-4 animate-spin' />
                <span className='text-sm'>Summarizing...</span>
              </div>
            )}
            {message.variants?.summary && (
              <p
                className={cn(
                  'font-body text-sm whitespace-pre-wrap',
                  'text-card-foreground/90'
                )}
              >
                {message.variants.summary}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
  if (message.message_type === 'voice' && message.variants?.audioDataUri) {
    return (
      <VoiceNotePlayer
        audioDataUri={message.variants.audioDataUri}
        transcription={message.variants.transcription}
        translatedContent={message.variants.translatedContent}
        isTranscribing={message.variants.isTranscribing}
        isSentByCurrentUser={isSentByCurrentUser}
        messageId={message.id}
        contactLinkId={message.contact_link_id}
      />
    );
  }

  const hasTranslation = !!message.variants?.translatedContent;
  const content =
    hasTranslation && displayMode !== 'original'
      ? message.variants?.translatedContent
      : message.content;

  return (
    <div className='space-y-2'>
      {/* Toggle for viewing original/translated */}
      {hasTranslation && !isSentByCurrentUser && (
        <div className='flex items-center gap-2'>
          <button
            onClick={() =>
              setDisplayMode(
                displayMode === 'translated' ? 'original' : 'translated'
              )
            }
            className='text-xs text-primary hover:underline flex items-center gap-1'
          >
            <Globe className='w-3 h-3' />
            {displayMode === 'translated'
              ? 'Show Original'
              : 'Show Translation'}
          </button>
          {displayMode === 'translated' && (
            <button
              onClick={() => setDisplayMode('both')}
              className='text-xs text-primary hover:underline'
            >
              Show Both
            </button>
          )}
        </div>
      )}

      {/* Message content */}
      <div className='space-y-2'>
        {displayMode === 'both' && hasTranslation ? (
          <>
            <div className='space-y-1'>
              <span className='text-xs font-medium text-muted-foreground'>
                Translation:
              </span>
              <p className='font-body text-sm whitespace-pre-wrap'>
                {message.variants?.translatedContent}
              </p>
            </div>
            <div className='space-y-1 opacity-75'>
              <span className='text-xs font-medium text-muted-foreground'>
                Original ({message.variants?.originalLanguage}):
              </span>
              <p className='font-body text-sm whitespace-pre-wrap italic'>
                {message.content}
              </p>
            </div>
          </>
        ) : (
          <p
            className={cn(
              'font-body text-sm whitespace-pre-wrap',
              displayMode === 'original' &&
                hasTranslation &&
                'italic opacity-75'
            )}
          >
            {content}
          </p>
        )}
      </div>

      {/* Translation status */}
      <MessageTranslationStatus
        isTranslating={isTranslating}
        translationModel={message.variants?.translationModel}
        originalLanguage={message.variants?.originalLanguage}
        translatedLanguage={message.variants?.translatedLanguage}
      />

      {message.variants?.simplifiedContent && (
        <div className='mt-3 pt-3 border-t border-border/50'>
          <p
            className={cn(
              'text-xs font-bold mb-1 font-headline',
              isSentByCurrentUser ? 'text-primary-foreground' : 'text-primary'
            )}
          >
            Simplified Version
          </p>
          <p
            className={cn(
              'font-body text-sm',
              isSentByCurrentUser
                ? 'text-primary-foreground/90'
                : 'text-card-foreground/90'
            )}
          >
            {message.variants.simplifiedContent}
          </p>
        </div>
      )}
    </div>
  );
};

const MessageActions = ({
  message,
  currentUserId,
  onEdit,
  onDelete,
  isEditing,
  isDeleting,
}: {
  message: ChatMessageType;
  currentUserId: string;
  onEdit: () => void;
  onDelete: () => void;
  isEditing: boolean;
  isDeleting: boolean;
}) => {
  // Only show actions for own messages
  if (message.sender_id !== currentUserId) return null;

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
                disabled={isEditing || isDeleting}
              >
                {isEditing || isDeleting ? (
                  <Loader2 className='h-3 w-3 animate-spin' />
                ) : (
                  <MoreHorizontal className='h-3 w-3' />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Message options</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align='end' className='w-32'>
          <DropdownMenuItem onClick={onEdit} className='text-xs'>
            <Edit3 className='h-3 w-3 mr-2' />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className='text-xs text-destructive focus:text-destructive'
          >
            <Trash2 className='h-3 w-3 mr-2' />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
};

export default function ChatMessage({
  message,
  currentUserId,
  contactId,
  isTranslating = false,
  onSimplify,
  onSummarize,
  channel,
  isNewMessage = false,
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const { editMessage, isEditing: isEditingMutate } = useMessageEdit(
    contactId,
    channel
  );
  const { deleteMessage, isDeleting: isDeletingMutate } = useMessageDelete(
    contactId,
    channel
  );

  const isSentByCurrentUser = message.sender_id === currentUserId;

  const showAIActions =
    !isSentByCurrentUser &&
    (message.message_type === 'text' || message.message_type === 'image');
  const isImageType =
    message.message_type === 'image' &&
    message.file_url &&
    message.content.match(/\.(jpeg|jpg|gif|png)$/i);
  const cardPadding =
    isImageType || message.message_type === 'voice' ? 'p-1' : 'p-3';

  const handleEdit = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessage({
        messageId: message.id,
        content: editContent.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMessage(message.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={cn(
        'flex items-end gap-2 group',
        isSentByCurrentUser ? 'justify-end' : 'justify-start'
      )}
    >
      <div className={cn('w-full max-w-lg')}>
        <Card
          className={cn(
            'shadow-md transition-all',
            isSentByCurrentUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card',
            isNewMessage && 'animate-new-message'
          )}
        >
          <CardContent className={cardPadding}>
            {isEditing ? (
              <div className='space-y-2'>
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    'text-sm',
                    isSentByCurrentUser
                      ? 'bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/60'
                      : 'bg-background border-input text-foreground placeholder:text-muted-foreground'
                  )}
                  placeholder='Edit your message...'
                  autoFocus
                />
                <div className='flex gap-2 justify-end'>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button size='sm' onClick={handleSaveEdit}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className='flex items-start justify-between gap-2'>
                <div className='flex-1'>
                  <MessageContent
                    message={message}
                    isSentByCurrentUser={isSentByCurrentUser}
                    isTranslating={isTranslating}
                    currentUserId={currentUserId}
                  />
                </div>

                {/* Message Actions */}
                <MessageActions
                  message={message}
                  currentUserId={currentUserId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isEditing={isEditingMutate}
                  isDeleting={isDeletingMutate}
                />
              </div>
            )}
          </CardContent>
          {!isSentByCurrentUser && (
            <CardFooter className='p-2 pt-0 flex justify-between items-center'>
              <span
                className={cn(
                  'text-xs',
                  isSentByCurrentUser
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                )}
              >
                {formatMessageTime(message.sent_at)}{' '}
                {message.variants?.originalLanguage &&
                  `· ${message.variants.originalLanguage}`}
              </span>
              {showAIActions && (
                <div className='flex items-center gap-2'>
                  {message.message_type === 'text' &&
                    onSimplify &&
                    !message.variants?.simplifiedContent && (
                      <AiActionButton
                        isLoading={message.variants?.isSimplifying}
                        onClick={() => onSimplify(message.id)}
                      >
                        <Sparkles className='w-3 h-3' />
                        <span>Simplify</span>
                      </AiActionButton>
                    )}
                  {message.message_type === 'image' &&
                    onSummarize &&
                    !message.variants?.summary && (
                      <AiActionButton
                        isLoading={message.variants?.isSummarizing}
                        onClick={() => onSummarize(message.id)}
                      >
                        <Sparkles className='w-3 h-3' />
                        <span>Summarize</span>
                      </AiActionButton>
                    )}
                </div>
              )}
            </CardFooter>
          )}
        </Card>
        {isSentByCurrentUser && (
          <p className='text-xs text-right text-muted-foreground mt-1 pr-2'>
            {formatMessageTime(message.sent_at)}
          </p>
        )}
      </div>
    </div>
  );
}
