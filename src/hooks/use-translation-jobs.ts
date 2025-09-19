'use client';

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

  // Initial load + Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    // Load initial data
    refreshJobs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('translation-jobs')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'translation_jobs'
        },
        (payload) => {
          // Handle realtime updates
          if (payload.eventType === 'INSERT') {
            setJobs(prev => [payload.new as TranslationJob, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setJobs(prev => prev.map(job =>
              job.id === payload.new.id ? payload.new as TranslationJob : job
            ));
          } else if (payload.eventType === 'DELETE') {
            setJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Subscribed successfully
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error subscribing to translation jobs updates');
        }
      });

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
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
