'use server';

import { realtimeTranslator } from '@/lib/aws/realtime-translate';
import { documentTranslator } from '@/lib/aws/translate-service';
import { translationRouter } from '@/lib/aws/translation-router';
import {
  type FileMetadata,
  getFileExtension,
  getMimeFromExtension,
} from '@/lib/document/file-utils';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const _TranslateDocumentActionSchema = z.object({
  fileUrl: z.string(),
  targetLanguage: z.string(),
  contactId: z.string().uuid(),
  messageId: z.string().uuid(),
  sourceLanguage: z.string().optional(),
  accessToken: z.string().optional(),
  currentUserId: z.string().optional(), // Firebase Auth UID of the user initiating the translation
});

export type TranslateDocumentInput = z.infer<
  typeof _TranslateDocumentActionSchema
>;

function detectFileType(fileName: string, blob?: Blob): FileMetadata {
  const extension = getFileExtension(fileName);
  let mimeType = blob?.type ?? getMimeFromExtension(extension);

  // AWS Translate batch API supported formats
  const awsDocumentFormats = ['docx', 'pptx', 'xlsx', 'html', 'txt'];
  const supportsDirectTranslation = awsDocumentFormats.includes(extension);

  // Convert unsupported MIME types to text/plain for AWS
  const awsSupportedMimeTypes = [
    'text/html',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/x-xliff+xml',
  ];

  if (!awsSupportedMimeTypes.includes(mimeType)) {
    console.warn(`Converting ${mimeType} to text/plain for AWS Translate`);
    mimeType = 'text/plain';
  }

  const translatableFormats = [
    'pdf',
    'docx',
    'doc',
    'pptx',
    'ppt',
    'xlsx',
    'xls',
    'html',
    'htm',
    'txt',
    'rtf',
    'csv',
    'json',
    'md',
    'markdown',
  ];

  return {
    mimeType,
    extension,
    isDocument: translatableFormats.includes(extension),
    canTranslate: translatableFormats.includes(extension),
    supportsDirectTranslation,
  };
}

/**
 * Download file using the same method as DocumentTranslator
 */
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
      throw new Error(
        `Message not found: ${messageError?.message || 'Unknown error'}`
      );
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
        const pathMatch = url.pathname.match(
          /\/storage\/v1\/object\/[^/]+\/chat-files\/(.+)/
        );
        if (pathMatch) {
          storagePath = pathMatch[1];
        }
      }
    } catch (urlParseError) {
      console.warn(
        'Could not parse URL for storage path extraction:',
        urlParseError
      );
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
      throw new Error(
        `Direct URL fetch failed: ${
          fetchError instanceof Error ? fetchError.message : 'Unknown error'
        }`
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to download file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

export async function translateDocumentWithAWS(input: TranslateDocumentInput) {
  try {
    const supabase = await createClient(input.accessToken);

    // 1. Check for cached translation and get message data
    const { data: messageData } = await supabase
      .from('messages')
      .select('content, variants, sender_id')
      .eq('id', input.messageId)
      .single();

    if (!messageData) {
      throw new Error('Message not found');
    }

    console.warn('🔐 Using Firebase Auth UID from message:', {
      userId: input.currentUserId,
    });

    const fileName = messageData.content || 'document';
    const fileMetadata = detectFileType(fileName);

    if (!fileMetadata.canTranslate) {
      const supportedFormats = [
        'pdf',
        'docx',
        'doc',
        'pptx',
        'ppt',
        'xlsx',
        'xls',
        'html',
        'htm',
        'txt',
        'rtf',
        'csv',
        'json',
        'md',
        'markdown',
      ].join(', ');

      throw new Error(
        `File type "${fileMetadata.extension}" is not supported. ` +
          `Supported formats: ${supportedFormats}. ` +
          `Original filename: ${fileName}`
      );
    }

    // 2. Download and analyze file for optimal translation method
    console.warn('📥 Downloading file for translation analysis...');
    const fileBlob = await downloadFileFromMessage(input.messageId, supabase);
    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    const fileContent = fileBuffer.toString('utf8');

    console.warn('✅ File downloaded successfully:', {
      fileName,
      size: fileBuffer.length,
      extension: fileMetadata.extension,
      mimeType: fileMetadata.mimeType,
    });

    // 3. Determine optimal translation method
    const route = translationRouter.analyzeFile({
      content: fileContent,
      size: fileBuffer.length,
      extension: fileMetadata.extension,
      mimeType: fileMetadata.mimeType,
      lineCount: fileContent.split('\n').length,
    });

    console.warn('🔍 Translation routing decision:', route);

    // 4. Check for cached translation (both methods)
    const cacheKeys = {
      batch: `aws_batch_${input.targetLanguage}`,
      realtime: `aws_realtime_${input.targetLanguage}`,
    };

    const relevantCacheKey =
      route.method === 'realtime' ? cacheKeys.realtime : cacheKeys.batch;

    if (messageData.variants?.[relevantCacheKey]?.downloadUrl) {
      try {
        const response = await fetch(
          messageData.variants[relevantCacheKey].downloadUrl,
          {
            method: 'HEAD',
          }
        );
        if (response.ok) {
          return {
            success: true,
            downloadUrl: messageData.variants[relevantCacheKey].downloadUrl,
            cached: true,
            method: route.method,
            estimatedTime: route.estimatedTime,
            formatPreserved: route.formatPreserved,
          };
        }
      } catch {
        // Cache invalid, proceed with new translation
      }
    }

    // 5. Execute translation based on route
    if (route.method === 'realtime') {
      return await executeRealtimeTranslation({
        fileContent,
        input,
        supabase,
        messageData,
        cacheKey: cacheKeys.realtime,
        currentUserId: input.currentUserId,
      });
    } else {
      return await executeBatchTranslation({
        fileBuffer,
        fileName,
        fileMetadata,
        input,
        supabase,
        messageData,
        cacheKey: cacheKeys.batch,
        estimatedTime: route.estimatedTime,
        currentUserId: input.currentUserId,
      });
    }
  } catch (error) {
    console.error('AWS translation error:', error);

    // Check if we should fallback from realtime to batch
    if (
      translationRouter.shouldFallbackToBatch(
        error instanceof Error ? error.message : ''
      )
    ) {
      console.warn('� Falling back to batch processing...');

      try {
        const supabase = await createClient(input.accessToken);

        // Get message data for fallback
        const { data: messageData } = await supabase
          .from('messages')
          .select('content, variants, sender_id')
          .eq('id', input.messageId)
          .single();

        if (messageData) {
          // Use sender_id as the Firebase Auth UID
          const fallbackUserId = messageData.sender_id;

          const fileName = messageData.content || 'document';
          const fileMetadata = detectFileType(fileName);
          const fileBlob = await downloadFileFromMessage(
            input.messageId,
            supabase
          );
          const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());

          return await executeBatchTranslation({
            fileBuffer,
            fileName,
            fileMetadata,
            input,
            supabase,
            messageData,
            cacheKey: `aws_batch_${input.targetLanguage}`,
            estimatedTime: '5-30 minutes',
            currentUserId: fallbackUserId,
          });
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed',
    };
  }
}

/**
 * Execute real-time translation
 */
async function executeRealtimeTranslation({
  fileContent,
  input,
  supabase,
  messageData,
  cacheKey,
  currentUserId,
}: {
  fileContent: string;
  input: TranslateDocumentInput;
  supabase: Awaited<ReturnType<typeof createClient>>;
  messageData: {
    content: string | null;
    variants: Record<string, unknown>;
    sender_id: string;
  };
  cacheKey: string;
  currentUserId?: string;
}) {
  console.warn('⚡ Starting real-time translation...');

  const result = await realtimeTranslator.translateText(
    fileContent,
    input.targetLanguage,
    input.sourceLanguage
  );

  if (!result.success) {
    throw new Error(result.error ?? 'Real-time translation failed');
  }

  // Store result in cache for future use
  await supabase
    .from('messages')
    .update({
      variants: {
        ...messageData.variants,
        [cacheKey]: {
          translatedContent: result.translatedText,
          completedAt: new Date().toISOString(),
          method: 'realtime',
          sourceLanguage: result.sourceLanguage,
        },
      },
    })
    .eq('id', input.messageId);

  console.warn('✅ Real-time translation completed');

  return {
    success: true,
    translatedContent: result.translatedText,
    method: 'realtime',
    estimatedTime: '5-15 seconds',
    formatPreserved: false,
  };
}

/**
 * Execute batch translation
 */
async function executeBatchTranslation({
  fileBuffer,
  fileName,
  fileMetadata,
  input,
  supabase,
  messageData,
  cacheKey,
  estimatedTime,
  currentUserId,
}: {
  fileBuffer: Buffer;
  fileName: string;
  fileMetadata: FileMetadata;
  input: TranslateDocumentInput;
  supabase: Awaited<ReturnType<typeof createClient>>;
  messageData: {
    content: string | null;
    variants: Record<string, unknown>;
    sender_id: string;
  };
  cacheKey: string;
  estimatedTime: string;
  currentUserId?: string;
}) {
  console.warn('📊 Starting batch translation...');

  // Check if job already exists in persistent storage
  const { data: existingJob } = await supabase
    .from('translation_jobs')
    .select('*')
    .eq('message_id', input.messageId)
    .eq('target_language', input.targetLanguage)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    existingJob &&
    ['SUBMITTED', 'IN_PROGRESS'].includes(existingJob.status)
  ) {
    return {
      success: true,
      jobId: existingJob.aws_job_id,
      status: existingJob.status,
      message: 'Translation job already in progress',
      method: 'batch',
      estimatedTime,
      formatPreserved: true,
    };
  }

  if (
    existingJob &&
    existingJob.status === 'COMPLETED' &&
    existingJob.download_url
  ) {
    return {
      success: true,
      jobId: existingJob.aws_job_id,
      status: existingJob.status,
      downloadUrl: existingJob.download_url,
      cached: true,
      method: 'batch',
      estimatedTime,
      formatPreserved: true,
    };
  }

  // Start AWS batch translation job
  const jobId = await documentTranslator.startTranslationJob(
    fileBuffer,
    fileName,
    fileMetadata.mimeType,
    input.targetLanguage,
    input.sourceLanguage
  );

  // Store job in persistent translation_jobs table
  const { error: jobError } = await supabase.from('translation_jobs').insert({
    message_id: input.messageId,
    contact_link_id: input.contactId,
    user_id: currentUserId,
    aws_job_id: jobId,
    job_name: `sea-bridge-${jobId}`,
    target_language: input.targetLanguage,
    source_language: input.sourceLanguage,
    original_filename: fileName,
    status: 'SUBMITTED',
    estimated_completion_time: estimatedTime,
    file_size_bytes: fileBuffer.length,
  });

  if (jobError) {
    console.error('Failed to save translation job:', jobError);
  }

  // Also store in message variants for backward compatibility
  await supabase
    .from('messages')
    .update({
      variants: {
        ...messageData.variants,
        [`${cacheKey}_job`]: {
          jobId,
          status: 'IN_PROGRESS',
          startedAt: new Date().toISOString(),
          originalFileName: fileName,
          fileExtension: fileMetadata.extension,
          method: 'batch',
        },
      },
    })
    .eq('id', input.messageId);

  console.warn('✅ Batch translation job started:', jobId);

  return {
    success: true,
    jobId,
    status: 'SUBMITTED',
    message: 'Professional translation started with format preservation.',
    method: 'batch',
    estimatedTime,
    formatPreserved: true,
  };
}

// Separate action to check job status
export async function checkTranslationStatus(
  jobId: string,
  messageId: string,
  targetLanguage: string,
  accessToken?: string
) {
  try {
    const supabase = await createClient(accessToken);
    const result = await documentTranslator.checkJobStatus(jobId);

    // Update persistent translation jobs table
    const updateData: Record<string, unknown> = {
      status: result.status,
      updated_at: new Date().toISOString(),
    };

    if (result.status === 'COMPLETED') {
      updateData.completed_at = new Date().toISOString();
      updateData.download_url = result.downloadUrl;
      updateData.progress_percent = 100;
    } else if (result.status === 'FAILED') {
      updateData.error_message = result.errorMessage ?? 'Translation failed';
    } else if (result.status === 'IN_PROGRESS' && 'progress' in result) {
      updateData.progress_percent = result.progress ?? 0;
    }

    await supabase
      .from('translation_jobs')
      .update(updateData)
      .eq('aws_job_id', jobId);

    if (result.status === 'COMPLETED' && result.downloadUrl) {
      // Also update message variants cache for backward compatibility
      const cacheKey = `aws_batch_${targetLanguage}`;

      await supabase
        .from('messages')
        .update({
          variants: {
            [`${cacheKey}`]: {
              downloadUrl: result.downloadUrl,
              completedAt: new Date().toISOString(),
              jobId,
            },
          },
        })
        .eq('id', messageId);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    };
  }
}
