'use server';

import { documentTranslator } from '@/lib/aws/translate-service';

export async function checkTranslationJobStatus(jobId: string) {
  try {
    return await documentTranslator.checkJobStatus(jobId);
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
