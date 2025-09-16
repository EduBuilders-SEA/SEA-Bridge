'use client';

import { translateDocumentWithAWS, checkTranslationStatus } from '@/app/actions/translate-document-aws';
import { useLanguageStore } from '@/components/store/language-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Download, Loader2, Sparkles, Cloud, CheckCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface DocumentTranslatorProps {
  fileUrl: string;
  fileName: string;
  contactId: string;
  messageId: string;
  variants?: Record<string, unknown>;
  isOwnMessage?: boolean;
}

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
  const pollIntervalRef = useRef<NodeJS.Timeout>();
  
  const { toast } = useToast();
  const { selectedLanguage } = useLanguageStore();
  const { user } = useAuth();

  // Check for existing job on mount
  useEffect(() => {
    const cacheKey = `aws_batch_${selectedLanguage}_job`;
    const existingJob = variants?.[cacheKey] as any;
    
    if (existingJob?.jobId && existingJob.status === 'IN_PROGRESS') {
      setJobId(existingJob.jobId);
      setIsTranslating(true);
      startPolling(existingJob.jobId);
    }
  }, [variants, selectedLanguage]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startPolling = async (jobId: string) => {
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
          clearInterval(pollIntervalRef.current!);
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
          clearInterval(pollIntervalRef.current!);
          setIsTranslating(false);
          
          toast({
            variant: 'destructive',
            title: 'Translation Failed',
            description: result.errorMessage || 'Please try again',
          });
        }
      }
    }, 3000);
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
    setStatus('Starting translation...');

    try {
      const accessToken = user ? await user.getIdToken() : undefined;
      
      const result = await translateDocumentWithAWS({
        fileUrl,
        targetLanguage: selectedLanguage,
        contactId,
        messageId,
        accessToken,
      });

      if (result.success) {
        if (result.cached && result.downloadUrl) {
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
        } else if (result.jobId) {
          // New job started
          setJobId(result.jobId);
          toast({
            title: 'Translation Started',
            description: 'Processing your document with AWS Translate...',
          });
          startPolling(result.jobId);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setIsTranslating(false);
      toast({
        variant: 'destructive',
        title: 'Translation Error',
        description: error instanceof Error ? error.message : 'Failed to start translation',
      });
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'SUBMITTED':
        return <Cloud className='w-4 h-4 animate-pulse' />;
      case 'IN_PROGRESS':
        return <Loader2 className='w-4 h-4 animate-spin' />;
      case 'COMPLETED':
        return <CheckCircle className='w-4 h-4 text-green-500' />;
      default:
        return <Sparkles className='w-4 h-4' />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'SUBMITTED':
        return 'Uploading to AWS...';
      case 'IN_PROGRESS':
        return `Translating to ${selectedLanguage}...`;
      case 'COMPLETED':
        return 'Translation complete!';
      default:
        return '';
    }
  };

  return (
    <div className='flex flex-col gap-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800'>
      {/* File Info */}
      <div className='flex items-start gap-3'>
        <div className='text-2xl'>📄</div>
        <div className='flex-1'>
          <p className='font-medium'>{fileName}</p>
          <div className='flex items-center gap-2 mt-1'>
            <Badge variant='outline' className='text-xs'>
              <Cloud className='w-3 h-3 mr-1' />
              AWS Translate
            </Badge>
            <Badge variant='secondary' className='text-xs'>
              Format Preserved
            </Badge>
          </div>
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
            <span className='font-mono'>{progress}%</span>
          </div>
          <Progress value={progress} className='h-2' />
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
          variant='outline'
          size='sm'
          onClick={() => window.open(fileUrl, '_blank')}
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