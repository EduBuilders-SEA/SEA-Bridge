'use client';

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
import { useActiveTranslationJobs } from '@/hooks/use-aws-translation-job';
import { formatDistanceToNow } from 'date-fns';
import {
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  Bell,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export function TranslationJobsNotification() {
  const {user} = useAuth();  
  const { data: activeJobs = [], isLoading } = useActiveTranslationJobs();
  const { toast } = useToast();


  const completedJobs = activeJobs.filter(job => job.status === 'COMPLETED' && job.user_id === user?.uid);
  const processingJobs = activeJobs.filter(job => ['SUBMITTED', 'IN_PROGRESS'].includes(job.status) && job.user_id === user?.uid);
  const failedJobs = activeJobs.filter(job => job.status === 'FAILED' && job.user_id === user?.uid);

  const totalActiveJobs = processingJobs.length;

  const handleDownload = async (job: any) => {
    if (!job.download_url) return;

    try {
      const link = document.createElement('a');
      link.href = job.download_url;
      link.target = '_blank';
      link.download = job.translated_filename || 'translated_document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Download Started',
        description: `${job.translated_filename} is downloading.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not download the file',
      });
    }
  };

  if (isLoading || activeJobs.length === 0) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline' size='sm' className='relative'>
          <Bell className='w-4 h-4' />
          {totalActiveJobs > 0 && (
            <>
              <span className='sr-only'>{totalActiveJobs} active translations</span>
              <Badge
                variant='destructive'
                className='absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs'
              >
                {totalActiveJobs}
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
          </SheetTitle>
          <SheetDescription>
            Track your document translation progress
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
                          {job.target_language} • Started {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
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
                          {job.target_language} • Completed {job.completed_at ? formatDistanceToNow(new Date(job.completed_at), { addSuffix: true }) : 'recently'}
                        </p>
                      </div>
                      <div className='flex items-center gap-2'>
                        <CheckCircle className='w-4 h-4 text-green-500' />
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => handleDownload(job)}
                          className='border-green-300 text-green-700 hover:bg-green-100'
                        >
                          <Download className='w-3 h-3' />
                        </Button>
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
                          {job.target_language} • Failed {formatDistanceToNow(new Date(job.updated_at), { addSuffix: true })}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}