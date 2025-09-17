'use client';

import { documentTranslator } from '@/lib/aws/translate-service';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';

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

export function useTranslationJobs() {
  const [jobs, setJobs] = useState<TranslationJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshJobs = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('translation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching translation jobs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ Enhanced effect with background polling management
  useEffect(() => {
    // Initial load
    refreshJobs();

    // Set up background polling for active jobs
    const setupBackgroundPolling = async () => {
      const supabase = createClient();
      const { data: activeJobs } = await supabase
        .from('translation_jobs')
        .select('aws_job_id, id, message_id, target_language')
        .in('status', ['SUBMITTED', 'IN_PROGRESS']);

      if (activeJobs) {
        activeJobs.forEach((job) => {
          documentTranslator.startBackgroundPolling(
            job.aws_job_id,
            (status) => {
              // Update job status in real-time without blocking UI
              if (status.status === 'COMPLETED' || status.status === 'FAILED') {
                // Refresh all jobs when a job completes
                refreshJobs();
              }
            }
          );
        });
      }
    };

    setupBackgroundPolling();

    // Cleanup function
    return () => {
      // Stop all background polling when component unmounts
      jobs.forEach((job) => {
        if (['SUBMITTED', 'IN_PROGRESS'].includes(job.status)) {
          documentTranslator.stopBackgroundPolling(job.aws_job_id);
        }
      });
    };
  }, []); // Only run on mount

  // ✅ Optimized periodic refresh (less frequent since background polling handles active jobs)
  useEffect(() => {
    const interval = setInterval(refreshJobs, 120000); // 2 minutes instead of 30 seconds
    return () => clearInterval(interval);
  }, [refreshJobs]);

  const activeJobsCount = jobs.filter((job) =>
    ['SUBMITTED', 'IN_PROGRESS'].includes(job.status)
  ).length;

  const completedJobsCount = jobs.filter(
    (job) => job.status === 'COMPLETED'
  ).length;

  return {
    jobs,
    isLoading,
    activeJobsCount,
    completedJobsCount,
    refreshJobs,
  };
}
