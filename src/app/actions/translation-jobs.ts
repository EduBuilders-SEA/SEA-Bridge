'use server';

import { documentTranslator } from '@/lib/aws/translate-service';
import { createClient } from '@/lib/supabase/server';

export async function checkTranslationJobStatus(jobId: string) {
  try {
    const awsStatus = await documentTranslator.checkJobStatus(jobId);

    if (awsStatus) {
      // Update Supabase database with the latest status
      const supabase = await createClient();
      const updateData: any = {
        status: awsStatus.status,
        updated_at: new Date().toISOString()
      };

      // Only update fields that exist in the AWS response
      if (awsStatus.downloadUrl) {
        updateData.download_url = awsStatus.downloadUrl;
      }
      if (awsStatus.errorMessage) {
        updateData.error_message = awsStatus.errorMessage;
      }
      if (awsStatus.progress !== undefined) {
        updateData.progress_percent = awsStatus.progress;
      }

      const { error } = await supabase
        .from('translation_jobs')
        .update(updateData)
        .eq('aws_job_id', jobId);

      if (error) {
        console.error('Error updating translation job in Supabase:', error);
        // Don't throw - still return AWS status even if DB update fails
      }
    }

    return awsStatus;
  } catch (error) {
    console.error('Error checking translation job status:', error);
    throw error;
  }
}

export async function startTranslationJobPolling(jobId: string) {
  // Note: Background polling needs to be handled differently for server actions
  // We'll return the current status instead of starting polling
  try {
    return await documentTranslator.checkJobStatus(jobId);
  } catch (error) {
    console.error('Error starting translation job polling:', error);
    throw error;
  }
}

export async function stopTranslationJobPolling(jobId: string) {
  try {
    documentTranslator.stopBackgroundPolling(jobId);
    return { success: true };
  } catch (error) {
    console.error('Error stopping translation job polling:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
