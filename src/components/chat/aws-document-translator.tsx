'use client';

import { getDownloadUrlAction } from '@/app/actions/get-download-url';
import {
  checkTranslationStatus,
  translateDocumentWithAWS,
} from '@/app/actions/translate-document-aws';
import { useLanguageStore } from '@/components/store/language-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Cloud,
  Download,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DocumentTranslatorProps {
  fileUrl: string;
  fileName: string;
  contactId: string;
  messageId: string;
  variants?: Record<string, unknown>;
  isOwnMessage?: boolean;
}

type TranslationMethod = 'realtime' | 'batch' | 'auto';

export function AWSDocumentTranslator({
  fileUrl,
  fileName,
  contactId,
  messageId,
  variants,
  isOwnMessage = false,
}: DocumentTranslatorProps) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [method, setMethod] = useState<TranslationMethod>('auto');
  const [estimatedTime, setEstimatedTime] = useState<string>('');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const { toast } = useToast();
  const { selectedLanguage } = useLanguageStore();
  const { user } = useAuth();

  const startPolling = useCallback(
    async (jobId: string) => {
      // Clear any existing interval
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }

      // Poll every 3 seconds
      pollIntervalRef.current = setInterval(async () => {
        const accessToken = user ? await user.getIdToken() : undefined;
        const result = await checkTranslationStatus(
          jobId,
          messageId,
          selectedLanguage,
          accessToken
        );

        if ('progress' in result && result.progress !== undefined) {
          setProgress(result.progress);
        }

        if ('status' in result) {
          setStatus(result.status);

          if (result.status === 'COMPLETED') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            setIsTranslating(false);

            if (result.downloadUrl) {
              // Auto-download
              const link = document.createElement('a');
              link.href = result.downloadUrl;
              link.download = `translated_${fileName}`;
              link.click();

              toast({
                title: 'Translation Complete! 🎉',
                description: `Document translated to ${selectedLanguage}`,
              });
            }
          } else if (result.status === 'FAILED') {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }
            setIsTranslating(false);

            toast({
              variant: 'destructive',
              title: 'Translation Failed',
              description: result.errorMessage ?? 'Please try again',
            });
          }
        }
      }, 3000);
    },
    [user, messageId, selectedLanguage, fileName, toast]
  );

  // Check for existing job on mount
  useEffect(() => {
    const cacheKey = `aws_batch_${selectedLanguage}_job`;
    const existingJob = variants?.[cacheKey] as
      | { jobId?: string; status?: string }
      | undefined;

    if (existingJob?.jobId && existingJob.status === 'IN_PROGRESS') {
      setJobId(existingJob.jobId);
      setIsTranslating(true);
      setMethod('batch');
      startPolling(existingJob.jobId);
    }
  }, [variants, selectedLanguage, startPolling]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleClickOriginal = async () => {
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
    }
  };

  const handleTranslate = async () => {
    if (!selectedLanguage) {
      toast({
        variant: 'destructive',
        title: 'Select a Language',
        description: 'Please choose a target language first.',
      });
      return;
    }

    setIsTranslating(true);
    setProgress(0);
    setStatus('Analyzing document...');

    try {
      const accessToken = user ? await user.getIdToken() : undefined;

      const result = await translateDocumentWithAWS({
        fileUrl,
        targetLanguage: selectedLanguage,
        contactId,
        messageId,
        accessToken,
        currentUserId: user?.uid
      },);

      if (result.success) {
        // Update UI based on translation method
        if ('method' in result) {
          setMethod(result.method as TranslationMethod);
          if (
            'estimatedTime' in result &&
            typeof result.estimatedTime === 'string'
          ) {
            setEstimatedTime(result.estimatedTime);
          }
        }

        // Handle cached batch result
        if (
          'cached' in result &&
          result.cached &&
          'downloadUrl' in result &&
          result.downloadUrl
        ) {
          // Cached result, download immediately
          const link = document.createElement('a');
          link.href = result.downloadUrl;
          link.download = `translated_${fileName}`;
          link.click();

          toast({
            title: 'Translation Ready!',
            description: 'Using cached translation',
          });
          setIsTranslating(false);
        }
        // Handle new batch job
        else if ('jobId' in result && result.jobId) {
          // Batch job started
          setJobId(result.jobId);
          setMethod('batch');
          toast({
            title: 'Professional Translation Started',
            description: `Processing with format preservation (${
              estimatedTime || '5-30 minutes'
            })`,
          });
          startPolling(result.jobId);
        }
        // Handle real-time translation result
        else if ('translatedContent' in result && result.translatedContent) {
          // Real-time translation completed
          setMethod('realtime');
          setProgress(100);
          setStatus('COMPLETED');
          setIsTranslating(false);

          // Create and download translated file
          if (typeof result.translatedContent === 'string') {
            const blob = new Blob([result.translatedContent], {
              type: 'text/plain',
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `translated_${fileName}`;
            link.click();
            URL.revokeObjectURL(url);
          }

          toast({
            title: 'Quick Translation Complete! ⚡',
            description: `Translated to ${selectedLanguage} instantly`,
          });
        }
      } else {
        // Handle error case
        const errorMessage =
          'error' in result ? result.error : 'Translation failed';
        throw new Error(errorMessage);
      }
    } catch (error) {
      setIsTranslating(false);
      toast({
        variant: 'destructive',
        title: 'Translation Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to start translation',
      });
    }
  };

  const getMethodInfo = () => {
    switch (method) {
      case 'realtime':
        return {
          icon: <Zap className='w-4 h-4 text-yellow-500' />,
          label: 'Quick Translation',
          description: '5-15 seconds • Text only',
          color:
            'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800',
        };
      case 'batch':
        return {
          icon: <Cloud className='w-4 h-4 text-blue-500' />,
          label: 'Professional Translation',
          description: `${estimatedTime || '5-30 minutes'} • Format preserved`,
          color:
            'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
        };
      default:
        return {
          icon: <Sparkles className='w-4 h-4 text-purple-500' />,
          label: 'Translate',
          description: 'Smart processing',
          color:
            'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800',
        };
    }
  };

  const getStatusIcon = () => {
    if (method === 'realtime' && isTranslating) {
      return <Zap className='w-4 h-4 animate-pulse text-yellow-500' />;
    }

    switch (status) {
      case 'SUBMITTED':
        return <Cloud className='w-4 h-4 animate-pulse' />;
      case 'IN_PROGRESS':
        return <Loader2 className='w-4 h-4 animate-spin' />;
      case 'COMPLETED':
        return <CheckCircle className='w-4 h-4 text-green-500' />;
      default:
        return <Clock className='w-4 h-4' />;
    }
  };

  const getStatusMessage = () => {
    if (method === 'realtime') {
      return isTranslating
        ? `Translating instantly...`
        : 'Ready for quick translation';
    }

    switch (status) {
      case 'SUBMITTED':
        return 'Uploading to AWS...';
      case 'IN_PROGRESS':
        return `Translating to ${selectedLanguage}...`;
      case 'COMPLETED':
        return 'Translation complete!';
      case 'Analyzing document...':
        return 'Choosing optimal processing method...';
      default:
        return 'Ready for translation';
    }
  };

  const methodInfo = getMethodInfo();

  return (
    <div
      className={`flex flex-col gap-4 p-4 rounded-lg border ${methodInfo.color}`}
    >
      {/* File Info */}
      <div className='flex items-start gap-3'>
        <div className='text-2xl'>📄</div>
        <div className='flex-1'>
          <p className='font-medium'>{fileName}</p>
          <div className='flex items-center gap-2 mt-1 flex-wrap'>
            <Badge variant='outline' className='text-xs'>
              {methodInfo.icon}
              <span className='ml-1'>{methodInfo.label}</span>
            </Badge>
            {method === 'batch' && (
              <Badge variant='secondary' className='text-xs'>
                Format Preserved
              </Badge>
            )}
            {method === 'realtime' && (
              <Badge variant='secondary' className='text-xs'>
                <AlertCircle className='w-3 h-3 mr-1' />
                Text Only
              </Badge>
            )}
          </div>
          <p className='text-xs text-muted-foreground mt-1'>
            {methodInfo.description}
          </p>
        </div>
      </div>

      {/* Progress */}
      {isTranslating && (
        <div className='space-y-3'>
          <div className='flex items-center justify-between text-sm'>
            <span className='flex items-center gap-2'>
              {getStatusIcon()}
              {getStatusMessage()}
            </span>
            {method === 'batch' && (
              <span className='font-mono'>{progress}%</span>
            )}
          </div>
          {method === 'batch' ? (
            <Progress value={progress} className='h-2' />
          ) : (
            <div className='h-2 bg-muted rounded-full overflow-hidden'>
              <div className='h-full bg-yellow-400 animate-pulse rounded-full' />
            </div>
          )}
          {jobId && (
            <p className='text-xs text-muted-foreground'>
              Job ID: {jobId.slice(0, 8)}...
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className='flex gap-2'>
        <Button
          variant='secondary'
          size='sm'
          className='flex-1 sm:flex-none'
          onClick={handleClickOriginal}
        >
          <Download className='w-4 h-4 mr-2' />
          Original
        </Button>

        {!isOwnMessage && selectedLanguage && (
          <Button
            size='sm'
            onClick={handleTranslate}
            disabled={isTranslating}
            className='flex-1'
          >
            {isTranslating ? (
              <>
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                {method === 'realtime' ? 'Translating...' : 'Processing...'}
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
