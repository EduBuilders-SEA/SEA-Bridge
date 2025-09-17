'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguageStore } from '@/components/store/language-store';
import {
  useTranslationJobForMessage,
  useStartTranslationJob,
  useTranslationNotifications,
  useCheckTranslationStatus
} from '@/hooks/use-aws-translation-job';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import {
  Download,
  Loader2,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  Bell
} from 'lucide-react';

interface AWSDocumentTranslatorProps {
  fileName: string;
  contactId: string;
  messageId: string;
  isOwnMessage?: boolean;
}

export function AWSDocumentTranslatorPersistent({
  fileName,
  contactId,
  messageId,
  isOwnMessage = false,
}: AWSDocumentTranslatorProps) {
  const { selectedLanguage } = useLanguageStore();
  const { user } = useAuth();
  const { toast } = useToast();

  // Initialize notification system
  useTranslationNotifications();

  // Get existing job for this message
  const { data: existingJob, isLoading: jobLoading } = useTranslationJobForMessage(messageId);

  // Mutations
  const startTranslation = useStartTranslationJob();
  const checkStatus = useCheckTranslationStatus();

  const cleanFileName = fileName
    .replace(/^(📎\s*)/, '')
    .replace(/\s*\(\d+(\.\d+)?\w+\)$/, '')
    .trim();

  const handleStartTranslation = async () => {
    if (!selectedLanguage) {
      toast({
        variant: 'destructive',
        title: 'No Language Selected',
        description: 'Please select a language to translate to.',
      });
      return;
    }

    await startTranslation.mutateAsync({
      messageId,
      targetLanguage: selectedLanguage,
      contactId,
    });
  };

  const handleManualDownload = async (downloadUrl: string, filename: string) => {
    try {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: '📥 Download Started',
        description: `${filename} is downloading`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not download the file',
      });
    }
  };

  const handleRefreshStatus = () => {
    if (existingJob?.aws_job_id) {
      checkStatus.mutate({
        jobId: existingJob.aws_job_id,
        messageId: existingJob.message_id,
        targetLanguage: existingJob.target_language,
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className='w-4 h-4 text-green-500' />;
      case 'FAILED':
      case 'STOPPED':
        return <XCircle className='w-4 h-4 text-red-500' />;
      case 'IN_PROGRESS':
      case 'SUBMITTED':
        return <Loader2 className='w-4 h-4 animate-spin text-blue-500' />;
      default:
        return <AlertCircle className='w-4 h-4 text-yellow-500' />;
    }
  };

  const getStatusText = (job: typeof existingJob) => {
    if (!job) return '';

    const timeAgo = formatDistanceToNow(new Date(job.created_at), { addSuffix: true });

    switch (job.status) {
      case 'SUBMITTED':
        return `Queued ${timeAgo}`;
      case 'IN_PROGRESS':
        return `Translating ${timeAgo} • ${job.progress_percent || 0}%`;
      case 'COMPLETED':
        return `Ready for download • Completed ${job.completed_at ? formatDistanceToNow(new Date(job.completed_at), { addSuffix: true }) : timeAgo}`;
      case 'FAILED':
        return `Failed ${timeAgo}`;
      case 'STOPPED':
        return `Stopped ${timeAgo}`;
      default:
        return `Status unknown`;
    }
  };

  if (jobLoading) {
    return (
      <div className='flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border animate-pulse'>
        <div className='h-4 bg-muted rounded w-1/3'></div>
        <div className='h-6 bg-muted rounded w-2/3'></div>
      </div>
    );
  }

  // Show completed job with download
  if (existingJob?.status === 'COMPLETED' && existingJob.download_url) {
    const isNotified = existingJob.user_notified;

    return (
      <div className={`flex flex-col gap-3 p-3 rounded-lg border ${
        !isNotified
          ? 'bg-green-100 border-green-300 ring-2 ring-green-200 ring-offset-1'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Badge variant='secondary' className='text-xs bg-green-100 text-green-800'>
              AWS Translate
            </Badge>
            <Badge variant='outline' className='text-xs text-green-700 border-green-300'>
              <CheckCircle className='w-3 h-3 mr-1' />
              Complete
            </Badge>
          </div>
          {!isNotified && (
            <Bell className='w-4 h-4 text-green-600 animate-pulse' />
          )}
        </div>

        <div className='flex items-center gap-2 text-sm text-green-700'>
          {getStatusIcon(existingJob.status)}
          <span>{getStatusText(existingJob)}</span>
        </div>

        <Button
          variant='default'
          size='sm'
          onClick={() => handleManualDownload(
            existingJob.download_url!,
            existingJob.translated_filename || `translated_${cleanFileName}`
          )}
          className='flex items-center gap-2 bg-green-600 hover:bg-green-700'
        >
          <Download className='w-4 h-4' />
          Download {existingJob.target_language} Version
        </Button>
      </div>
    );
  }

  // Show failed job
  if (existingJob?.status === 'FAILED') {
    return (
      <div className='flex flex-col gap-3 p-3 bg-red-50 rounded-lg border border-red-200'>
        <div className='flex items-center gap-2'>
          <Badge variant='secondary' className='text-xs bg-red-100 text-red-800'>
            AWS Translate
          </Badge>
          <Badge variant='outline' className='text-xs text-red-700 border-red-300'>
            <XCircle className='w-3 h-3 mr-1' />
            Failed
          </Badge>
        </div>

        <div className='flex items-center gap-2 text-sm text-red-700'>
          {getStatusIcon(existingJob.status)}
          <span>{getStatusText(existingJob)}</span>
        </div>

        {existingJob.error_message && (
          <p className='text-xs text-red-600 bg-red-100 p-2 rounded'>
            {existingJob.error_message}
          </p>
        )}

        {!isOwnMessage && (
          <Button
            variant='outline'
            size='sm'
            onClick={handleStartTranslation}
            disabled={startTranslation.isPending}
            className='flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50'
          >
            {startTranslation.isPending ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className='w-4 h-4' />
                Retry Translation
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  // Show job in progress
  if (existingJob && ['SUBMITTED', 'IN_PROGRESS'].includes(existingJob.status)) {
    return (
      <div className='flex flex-col gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200'>
        <div className='flex items-center gap-2'>
          <Badge variant='secondary' className='text-xs bg-blue-100 text-blue-800'>
            AWS Translate
          </Badge>
          <Badge variant='outline' className='text-xs text-blue-700 border-blue-300'>
            <Loader2 className='w-3 h-3 mr-1 animate-spin' />
            Processing
          </Badge>
        </div>

        <div className='flex items-center justify-between gap-2 text-sm text-blue-700'>
          <div className='flex items-center gap-2'>
            {getStatusIcon(existingJob.status)}
            <span>{getStatusText(existingJob)}</span>
          </div>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleRefreshStatus}
            disabled={checkStatus.isPending}
            className='h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100'
          >
            <RefreshCw className={`w-3 h-3 ${checkStatus.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {existingJob.progress_percent > 0 && (
          <div className='space-y-1'>
            <Progress value={existingJob.progress_percent} className='h-2' />
          </div>
        )}

        {existingJob.estimated_completion_time && (
          <p className='text-xs text-blue-600 flex items-center gap-1'>
            <Clock className='w-3 h-3' />
            ETA: {existingJob.estimated_completion_time}
          </p>
        )}

        <div className='bg-blue-100 p-2 rounded text-xs text-blue-700'>
          <Bell className='w-3 h-3 inline mr-1' />
          You'll be notified when your translation is ready. Safe to leave this page.
        </div>
      </div>
    );
  }

  // Show start translation button (no existing job)
  if (!isOwnMessage && !existingJob) {
    return (
      <div className='flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border'>
        <div className='flex items-center gap-2'>
          <Badge variant='secondary' className='text-xs'>
            AWS Translate
          </Badge>
          <Badge variant='outline' className='text-xs'>
            Professional Quality
          </Badge>
        </div>

        <Button
          variant='default'
          size='sm'
          disabled={startTranslation.isPending}
          onClick={handleStartTranslation}
          className='flex items-center gap-2'
        >
          {startTranslation.isPending ? (
            <>
              <Loader2 className='w-4 h-4 animate-spin' />
              Starting...
            </>
          ) : (
            <>
              <Sparkles className='w-4 h-4' />
              Translate to {selectedLanguage}
            </>
          )}
        </Button>

        <p className='text-xs text-muted-foreground'>
          ⏱️ Takes 2-5 minutes • You'll be notified when ready
        </p>
      </div>
    );
  }

  return null;
}