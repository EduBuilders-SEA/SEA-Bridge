'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { translateDocumentWithAWS, checkTranslationStatus } from '@/app/actions/translate-document-aws';
import { useCallback, useEffect } from 'react';

export interface TranslationJob {
  id: string;
  message_id: string;
  contact_link_id: string;
  aws_job_id: string;
  job_name: string;
  target_language: string;
  source_language?: string;
  original_filename: string;
  status: 'SUBMITTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'STOPPED';
  progress_percent: number;
  translated_filename?: string;
  download_url?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  estimated_completion_time?: string;
  processing_time_ms?: number;
  word_count?: number;
  file_size_bytes?: number;
  user_notified?: boolean;
  user_id: string;
}

// Smart notification system
export function useTranslationNotifications() {
  const { data: activeJobs = [] } = useActiveTranslationJobs();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const supabase = createClient();
  const { user } = useAuth();

  const markJobNotified = useCallback(async (jobId: string) => {
    if (!user?.uid) return;

    try {
      await supabase
        .from('translation_jobs')
        .update({ user_notified: true })
        .eq('id', jobId);

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['translation-jobs'] });
    } catch (error) {
      console.error('Failed to mark job as notified:', error);
    }
  }, [supabase, user?.uid, queryClient]);

  const handleSmartDownload = useCallback((job: TranslationJob) => {
    if (!job.download_url) return;

    // Auto-download logic based on file size
    const shouldAutoDownload = (job.file_size_bytes || 0) < 1024 * 1024; // < 1MB

    if (shouldAutoDownload) {
      // Auto-download small files
      const link = document.createElement('a');
      link.href = job.download_url;
      link.download = job.translated_filename || `translated_${job.original_filename}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: '✅ Translation Complete!',
        description: `${job.original_filename} downloaded automatically`,
      });
    } else {
      // Show notification with download button for large files
      toast({
        title: '🎉 Translation Ready!',
        description: `${job.original_filename} (${job.target_language}) - Click to download manually from the notification center`,
        duration: 10000, // Longer duration for important notifications
      });
    }

    markJobNotified(job.id);
  }, [toast, markJobNotified]);

  // Monitor for newly completed jobs
  useEffect(() => {
    const newlyCompletedJobs = activeJobs.filter(
      job => job.status === 'COMPLETED' &&
             job.download_url &&
             !job.user_notified
    );

    newlyCompletedJobs.forEach(handleSmartDownload);
  }, [activeJobs, handleSmartDownload]);

  // Monitor for failed jobs
  useEffect(() => {
    const newlyFailedJobs = activeJobs.filter(
      job => job.status === 'FAILED' && !job.user_notified
    );

    newlyFailedJobs.forEach(job => {
      toast({
        variant: 'destructive',
        title: '❌ Translation Failed',
        description: `${job.original_filename} could not be translated${job.error_message ? `: ${job.error_message}` : ''}`,
        duration: 8000,
      });

      markJobNotified(job.id);
    });
  }, [activeJobs, toast, markJobNotified]);
}

// Get all active jobs for current user
export function useActiveTranslationJobs() {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['translation-jobs', 'active', user?.uid],
    queryFn: async (): Promise<TranslationJob[]> => {
      if (!user?.uid) return [];

      const { data, error } = await supabase
        .from('translation_jobs')
        .select('*')
        .in('status', ['SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'])
        .order('created_at', { ascending: false })
        .limit(20); // Reasonable limit

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.uid,
    refetchInterval: 10000, // Poll every 10 seconds for active jobs
  });
}

// Get job for specific message
export function useTranslationJobForMessage(messageId: string) {
  const { user } = useAuth();
  const supabase = createClient();

  return useQuery({
    queryKey: ['translation-jobs', 'message', messageId, user?.uid],
    queryFn: async (): Promise<TranslationJob | null> => {
      if (!user?.uid) return null;

      const { data, error } = await supabase
        .from('translation_jobs')
        .select('*')
        .eq('message_id', messageId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.uid && !!messageId,
    refetchInterval: 10000, // Poll every 10 seconds, will be handled by the React Query cache
  });
}

// Start translation job
export function useStartTranslationJob() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      messageId: string;
      targetLanguage: string;
      contactId: string;
      sourceLanguage?: string;
    }) => {
      const accessToken = user ? await user.getIdToken() : undefined;

      const result = await translateDocumentWithAWS({
        fileUrl: '', // Not needed, we download from messageId
        targetLanguage: input.targetLanguage,
        contactId: input.contactId,
        messageId: input.messageId,
        sourceLanguage: input.sourceLanguage,
        accessToken,
      });

      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['translation-jobs', 'active', user?.uid]
      });
      queryClient.invalidateQueries({
        queryKey: ['translation-jobs', 'message', variables.messageId, user?.uid]
      });

      if (data.success) {
        toast({
          title: 'Translation Started',
          description: `Processing ${variables.targetLanguage} translation. You'll be notified when ready.`,
        });
      }
    },
    onError: (error) => {
      console.error('Translation job start failed:', error);
      toast({
        variant: 'destructive',
        title: 'Translation Failed',
        description: error instanceof Error ? error.message : 'Could not start translation',
      });
    },
  });
}

// Check job status (manual trigger)
export function useCheckTranslationStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { jobId: string; messageId?: string; targetLanguage?: string }) => {
      const accessToken = user ? await user.getIdToken() : undefined;
      return await checkTranslationStatus(
        input.jobId,
        input.messageId || '',
        input.targetLanguage || '',
        accessToken
      );
    },
    onSuccess: (data, input) => {
      // Update all relevant queries
      queryClient.invalidateQueries({
        queryKey: ['translation-jobs']
      });
    },
  });
}