'use client';

import { checkTranslationStatus } from '@/app/actions/translate-document-aws';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { useTranslationJobs } from '@/hooks/use-translation-jobs';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  XCircle,
} from 'lucide-react';

// Define the TranslationJob interface locally
interface TranslationJob {
  id: string;
  message_id: string;
  aws_job_id: string;
  status: string;
  target_language: string;
  original_filename: string;
  translated_filename?: string;
  progress_percent: number;
  download_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  estimated_completion_time?: string;
}

export function TranslationJobsNotification() {
  const { jobs, isLoading, activeJobsCount, completedJobsCount, refreshJobs } =
    useTranslationJobs();
  const { toast } = useToast();

  const completedJobs = jobs.filter((job) => job.status === 'COMPLETED');
  const processingJobs = jobs.filter((job) =>
    ['SUBMITTED', 'IN_PROGRESS'].includes(job.status)
  );
  const failedJobs = jobs.filter((job) => job.status === 'FAILED');

  const handleDownload = async (job: TranslationJob) => {
    if (!job.download_url) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'No download URL available for this job.',
      });
      return;
    }

    try {
      // ✅ First, try to validate the download URL
      console.warn('🔄 Attempting to download:', {
        jobId: job.aws_job_id,
        downloadUrl: job.download_url,
        filename: job.translated_filename ?? job.original_filename,
      });

      const response = await fetch(job.download_url, { method: 'HEAD' });

      if (!response.ok) {
        console.warn('Direct download failed, refreshing job status...', {
          status: response.status,
          statusText: response.statusText,
        });

        // ✅ Refresh job status to get new download URL
        const statusResult = await checkTranslationStatus(
          job.aws_job_id,
          job.message_id,
          job.target_language
        );

        if (
          statusResult &&
          'downloadUrl' in statusResult &&
          statusResult.downloadUrl
        ) {
          console.warn('✅ Got fresh download URL, retrying...');

          // Try with the fresh URL
          const freshResponse = await fetch(statusResult.downloadUrl);

          if (!freshResponse.ok) {
            throw new Error(
              `Fresh URL also failed: ${freshResponse.status} ${freshResponse.statusText}`
            );
          }

          const blob = await freshResponse.blob();
          const downloadFilename =
            job.translated_filename ?? `translated_${job.original_filename}`;

          // Trigger download
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = downloadFilename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          toast({
            title: 'Download Complete',
            description: `${downloadFilename} has been downloaded successfully.`,
          });

          // Refresh the jobs list
          refreshJobs();
          return;
        }

        throw new Error(
          `Could not refresh download URL: ${response.status} ${response.statusText}`
        );
      }

      // ✅ If HEAD request succeeds, proceed with actual download
      const downloadResponse = await fetch(job.download_url);

      if (!downloadResponse.ok) {
        throw new Error(
          `Download failed: ${downloadResponse.status} ${downloadResponse.statusText}`
        );
      }

      const blob = await downloadResponse.blob();
      const downloadFilename =
        job.translated_filename ?? `translated_${job.original_filename}`;

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Download Complete',
        description: `${downloadFilename} has been downloaded successfully.`,
      });
    } catch (error) {
      console.error('Download failed:', error);

      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description:
          error instanceof Error
            ? `Could not download file: ${error.message}`
            : 'An unknown error occurred during download.',
      });
    }
  };

  if (isLoading || jobs.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline' size='sm' className='relative'>
          <Bell className='w-4 h-4' />
          {activeJobsCount > 0 && (
            <>
              <span className='sr-only'>
                {activeJobsCount} active translations
              </span>
              <Badge
                variant='destructive'
                className='absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs'
              >
                {activeJobsCount}
              </Badge>
            </>
          )}
          {completedJobsCount > 0 && activeJobsCount === 0 && (
            <>
              <span className='sr-only'>
                {completedJobsCount} completed translations
              </span>
              <Badge
                variant='secondary'
                className='absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-green-100 text-green-700 border-green-300'
              >
                {completedJobsCount}
              </Badge>
            </>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className='w-[400px] sm:w-[540px]'>
        <SheetHeader>
          <SheetTitle className='flex items-center gap-2'>
            <FileText className='w-5 h-5' />
            Translation Jobs
            {activeJobsCount > 0 && (
              <Badge variant='outline' className='ml-2'>
                {activeJobsCount} processing
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Track your document translation progress in real-time
          </SheetDescription>
        </SheetHeader>

        <div className='mt-6 space-y-4'>
          {/* Processing Jobs */}
          {processingJobs.length > 0 && (
            <div className='space-y-2'>
              <h3 className='font-medium text-sm text-muted-foreground'>
                Processing ({processingJobs.length})
              </h3>
              {processingJobs.map((job) => (
                <Card key={job.id} className='border-blue-200 bg-blue-50'>
                  <CardContent className='p-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1 min-w-0'>
                        <p className='font-medium truncate text-sm'>
                          {job.original_filename}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {job.target_language} • Started{' '}
                          {formatDistanceToNow(new Date(job.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                        {job.estimated_completion_time && (
                          <p className='text-xs text-blue-600'>
                            ETA: {job.estimated_completion_time}
                          </p>
                        )}
                      </div>
                      <div className='flex items-center gap-2'>
                        <Loader2 className='w-4 h-4 animate-spin text-blue-500' />
                        <span className='text-xs text-blue-600'>
                          {job.progress_percent || 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Completed Jobs */}
          {completedJobs.length > 0 && (
            <div className='space-y-2'>
              <h3 className='font-medium text-sm text-muted-foreground'>
                Ready for Download ({completedJobs.length})
              </h3>
              {completedJobs.map((job) => (
                <Card key={job.id} className='border-green-200 bg-green-50'>
                  <CardContent className='p-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1 min-w-0'>
                        <p className='font-medium truncate text-sm'>
                          {job.original_filename}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {job.target_language} • Completed{' '}
                          {formatDistanceToNow(new Date(job.updated_at), {
                            addSuffix: true,
                          })}
                        </p>
                        {job.download_url && (
                          <p className='text-xs text-green-600 mt-1'>
                            ✅ Ready to download
                          </p>
                        )}
                      </div>
                      <div className='flex items-center gap-2'>
                        <CheckCircle className='w-4 h-4 text-green-500' />
                        {job.status === 'COMPLETED' && job.download_url && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => handleDownload(job)}
                            className='border-green-300 text-green-700 hover:bg-green-100'
                          >
                            <Download className='w-3 h-3' />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Failed Jobs */}
          {failedJobs.length > 0 && (
            <div className='space-y-2'>
              <h3 className='font-medium text-sm text-muted-foreground'>
                Failed ({failedJobs.length})
              </h3>
              {failedJobs.map((job) => (
                <Card key={job.id} className='border-red-200 bg-red-50'>
                  <CardContent className='p-3'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex-1 min-w-0'>
                        <p className='font-medium truncate text-sm'>
                          {job.original_filename}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {job.target_language} • Failed{' '}
                          {formatDistanceToNow(new Date(job.updated_at), {
                            addSuffix: true,
                          })}
                        </p>
                        {job.error_message && (
                          <p className='text-xs text-red-600 mt-1'>
                            {job.error_message}
                          </p>
                        )}
                      </div>
                      <XCircle className='w-4 h-4 text-red-500' />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Real-time status indicator */}
          {activeJobsCount > 0 && (
            <div className='pt-4 border-t'>
              <div className='flex items-center justify-center gap-2 text-xs text-muted-foreground'>
                <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse'></div>
                Checking for updates every 30 seconds
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
