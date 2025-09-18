'use client';

import { checkTranslationJobStatus } from '@/app/actions/translation-jobs';
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
  }, []); // Only run on mount

  // ✅ Set up client-side polling for active jobs using server actions
  useEffect(() => {
    const activeJobIds = jobs
      .filter((job) => ['SUBMITTED', 'IN_PROGRESS'].includes(job.status))
      .map((job) => job.aws_job_id);

    if (activeJobIds.length === 0) {
      return; // No active jobs to poll
    }

    const pollActiveJobs = async () => {
      try {
        // Check status of all active jobs
        const statusPromises = activeJobIds.map(async (jobId) => {
          try {
            return await checkTranslationJobStatus(jobId);
          } catch (error) {
            console.error(`Error checking status for job ${jobId}:`, error);
            return null;
          }
        });

        const statuses = await Promise.all(statusPromises);

        // Check if any job completed or failed
        const hasCompletedJob = statuses.some(
          (status) =>
            status &&
            (status.status === 'COMPLETED' || status.status === 'FAILED')
        );

        if (hasCompletedJob) {
          // Refresh all jobs when a job completes
          refreshJobs();
        }
      } catch (error) {
        console.error('Error polling active jobs:', error);
      }
    };

    // Poll every 30 seconds for active jobs
    const pollInterval = setInterval(pollActiveJobs, 30000);

    // Also poll immediately
    pollActiveJobs();

    return () => {
      clearInterval(pollInterval);
    };
  }, [jobs, refreshJobs]);

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
