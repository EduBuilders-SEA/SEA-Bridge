'use server';

import { documentTranslator } from '@/lib/aws/translate-service';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const _TranslateDocumentInputSchema = z.object({
  fileUrl: z.string(),
  targetLanguage: z.string(),
  contactId: z.string(),
  messageId: z.string(),
  sourceLanguage: z.string().optional(),
  accessToken: z.string().optional(),
});

export async function translateDocumentWithAWSPersistent(
  input: z.infer<typeof _TranslateDocumentInputSchema>
) {
  try {
    const supabase = await createClient(input.accessToken);

    // Get message and file info
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select('content, file_url, sender_id')
      .eq('id', input.messageId)
      .single();

    if (messageError || !messageData) {
      throw new Error('Message not found');
    }

    const fileName = messageData.content || 'document';

    // Check if job already exists
    const { data: existingJob } = await supabase
      .from('translation_jobs')
      .select('*')
      .eq('message_id', input.messageId)
      .eq('target_language', input.targetLanguage)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJob && ['SUBMITTED', 'IN_PROGRESS'].includes(existingJob.status)) {
      return {
        success: true,
        jobId: existingJob.aws_job_id,
        status: existingJob.status,
        message: 'Translation job already in progress',
      };
    }

    if (existingJob && existingJob.status === 'COMPLETED' && existingJob.download_url) {
      return {
        success: true,
        jobId: existingJob.aws_job_id,
        status: existingJob.status,
        downloadUrl: existingJob.download_url,
        cached: true,
      };
    }

    // Download and start AWS translation
    const fileBlob = await downloadFileFromMessage(input.messageId, supabase);
    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());

    // Start AWS translation job
    const awsJobId = await documentTranslator.startTranslationJob(
      fileBuffer,
      fileName,
      'text/plain', // Or detect MIME type
      input.targetLanguage,
      input.sourceLanguage
    );

    // Save job to database
    const { error: jobError } = await supabase
      .from('translation_jobs')
      .insert({
        message_id: input.messageId,
        contact_link_id: input.contactId,
        user_id: messageData.sender_id,
        aws_job_id: awsJobId,
        job_name: `sea-bridge-${awsJobId}`,
        target_language: input.targetLanguage,
        source_language: input.sourceLanguage,
        original_filename: fileName,
        status: 'SUBMITTED',
        estimated_completion_time: '2-5 minutes',
        file_size_bytes: fileBuffer.length,
      })
      .select()
      .single();

    if (jobError) {
      console.error('Failed to save translation job:', jobError);
      // Job started in AWS but not tracked - this is still success
    }

    return {
      success: true,
      jobId: awsJobId,
      status: 'SUBMITTED',
      estimatedTime: '2-5 minutes',
    };

  } catch (error) {
    console.error('AWS translation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed',
    };
  }
}

export async function checkAWSTranslationStatus(
  awsJobId: string,
  accessToken?: string
) {
  try {
    const supabase = await createClient(accessToken);

    // Check AWS status
    const awsStatus = await documentTranslator.checkJobStatus(awsJobId);

    // Update database
    const updateData: Record<string, unknown> = {
      status: awsStatus.status,
      updated_at: new Date().toISOString(),
    };

    if (awsStatus.status === 'COMPLETED') {
      updateData.completed_at = new Date().toISOString();
      updateData.download_url = awsStatus.downloadUrl;
      updateData.progress_percent = 100;
    } else if (awsStatus.status === 'FAILED') {
      updateData.error_message = awsStatus.errorMessage || 'Translation failed';
    }

    const { error: updateError } = await supabase
      .from('translation_jobs')
      .update(updateData)
      .eq('aws_job_id', awsJobId);

    if (updateError) {
      console.error('Failed to update job status:', updateError);
    }

    return {
      success: true,
      status: awsStatus.status,
      downloadUrl: awsStatus.downloadUrl,
      message: awsStatus.errorMessage,
    };

  } catch (error) {
    console.error('Status check error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    };
  }
}

// Helper function to download file from message
async function downloadFileFromMessage(
  messageId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Blob> {
  try {
    // Get the message to find the file_url
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select('file_url, content')
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      throw new Error(`Message not found: ${messageError?.message || 'Unknown error'}`);
    }

    if (!messageData.file_url) {
      throw new Error('No file URL found in message');
    }

    // Extract storage path from the signed URL for Supabase storage
    let storagePath: string | null = null;

    try {
      const url = new URL(messageData.file_url);
      // Check if it's a Supabase storage URL
      if (url.pathname.includes('/storage/v1/object/')) {
        // Extract path after bucket name
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/[^/]+\/chat-files\/(.+)/);
        if (pathMatch) {
          storagePath = pathMatch[1];
        }
      }
    } catch (urlParseError) {
      console.warn('Could not parse URL for storage path extraction:', urlParseError);
    }

    // If we have a storage path, try downloading from Supabase storage first
    if (storagePath) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('chat-files')
          .download(storagePath);

        if (!downloadError && fileData) {
          return fileData;
        } else {
          console.warn('Storage download failed:', downloadError);
        }
      } catch (storageError) {
        console.warn('Storage download error:', storageError);
      }
    }

    // Fallback to direct URL fetch
    try {
      const response = await fetch(messageData.file_url);
      if (response.ok) {
        return await response.blob();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (fetchError) {
      throw new Error(`Direct URL fetch failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

  } catch (error) {
    throw new Error(
      `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}