'use client';

import { getDownloadUrlAction } from '@/app/actions/get-download-url';
import { translateDocumentAction } from '@/app/actions/translate-document';
import { useLanguageStore } from '@/components/store/language-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';

interface DocumentTranslatorProps {
  fileUrl: string;
  fileName: string;
  contactId: string;
  messageId: string;
  variants?: Record<string, unknown>;
  senderId?: string;
  isOwnMessage?: boolean;
}

function detectFileType(fileName: string) {
  const extension =
    fileName
      .replace(/^(📎\s*)/, '')
      .replace(/\s*\(\d+(\.\d+)?\w+\)$/, '')
      .trim()
      .split('.')
      .pop()
      ?.toLowerCase() ?? '';
  const translatableTypes = [
    'pdf',
    'docx',
    'doc',
    'pptx',
    'ppt',
    'xlsx',
    'xls',
    'html',
    'htm',
    'md',
    'markdown',
    'mdown',
    'mkd',
    'mkdn',
    'txt',
    'rtf',
    'csv',
    'json',
  ];
  return {
    extension,
    canTranslate: translatableTypes.includes(extension),
  };
}

export function DocumentTranslator({
  fileUrl,
  fileName,
  contactId,
  messageId,
  isOwnMessage = false,
}: DocumentTranslatorProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const { selectedLanguage } = useLanguageStore();
  const { user } = useAuth();

  const fileMetadata = detectFileType(fileName);
  const cleanFileName = fileName
    .replace(/^(📎\s*)/, '')
    .replace(/\s*\(\d+(\.\d+)?\w+\)$/, '')
    .trim();

  const handleDownloadOriginal = async () => {
    setIsDownloading(true);
    try {
      const accessToken = user ? await user.getIdToken() : undefined;
      const result = await getDownloadUrlAction({ messageId, accessToken });

      if (result.success && result.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.target = '_blank';
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error(result.error ?? 'Failed to get download link.');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Translate handler
  const handleTranslate = async () => {
    if (!selectedLanguage) {
      toast({
        variant: 'destructive',
        title: 'No Language Selected',
        description: 'Please select a language to translate to.',
      });
      return;
    }

    setIsTranslating(true);
    setProgress(0);
    try {
      const accessToken = user ? await user.getIdToken() : undefined;

      const result = await translateDocumentAction({
        fileUrl,
        targetLanguage: selectedLanguage,
        contactId,
        messageId,
        accessToken,
        onProgress: (p: number) => setProgress(p),
      });

      if (result.success && result.downloadUrl) {
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.target = '_blank';
        link.download = result.fileName || `translated_${cleanFileName}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({
          title: result.cached ? 'Translation Ready!' : 'Translation Complete!',
          description: `Document in ${selectedLanguage} is ready.`,
        });
      } else {
        throw new Error(result.error ?? 'Translation failed');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Translation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsTranslating(false);
      setProgress(0);
    }
  };

  return (
    <div className='flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border border-border/50'>
      {/* Info */}
      <div className='flex items-start gap-3'>
        <div className='text-2xl'>📁</div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <p className='font-medium truncate'>{cleanFileName}</p>
            {!fileMetadata.canTranslate && (
              <Badge variant='secondary' className='text-xs'>
                View Only
              </Badge>
            )}
          </div>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <span className='capitalize'>
              {fileMetadata.extension.toUpperCase()} Document
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      {(isTranslating || isDownloading) && (
        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span className='text-muted-foreground flex items-center gap-2'>
              <Loader2 className='w-4 h-4 animate-spin' />
              {isDownloading ? 'Preparing download...' : 'Translating...'}
            </span>
            {isTranslating && (
              <span className='text-muted-foreground'>{progress}%</span>
            )}
          </div>
          {isTranslating && <Progress value={progress} className='h-2' />}
        </div>
      )}

      {/* Action buttons */}
      <div className='flex flex-wrap gap-2'>
        {/* Download Original */}
        <Button
          variant='outline'
          size='sm'
          className='flex-1 sm:flex-none'
          onClick={handleDownloadOriginal}
          disabled={isDownloading || isTranslating}
        >
          {isDownloading ? (
            <>
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
              Preparing...
            </>
          ) : (
            <>
              <Download className='w-4 h-4 mr-2' />
              Download Original
            </>
          )}
        </Button>

        {/* Translate & Download Button */}
        {fileMetadata.canTranslate && !isOwnMessage && (
          <Button
            variant='default'
            size='sm'
            disabled={isTranslating || isDownloading}
            className='flex-1 sm:flex-none min-w-[180px]'
            onClick={handleTranslate}
          >
            {isTranslating ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className='w-4 h-4 mr-2' />
                Download in {selectedLanguage}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
