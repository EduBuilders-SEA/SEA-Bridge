'use server';

import { documentTranslator } from '@/lib/aws/translate-service';
import { downloadFromS3 } from '@/lib/aws/s3-utils';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const TranslateDocumentSchema = z.object({
  fileUrl: z.string(),
  targetLanguage: z.string(),
  contactId: z.string(),
  messageId: z.string(),
  sourceLanguage: z.string().optional(),
  accessToken: z.string().optional(),
});

export type TranslateDocumentInput = z.infer<typeof TranslateDocumentSchema>;

interface FileMetadata {
  mimeType: string;
  extension: string;
  isDocument: boolean;
  canTranslate: boolean;
  supportsDirectTranslation: boolean;
}

/**
 * Enhanced file type detection with AWS Translate support
 */
function detectFileType(fileName: string, blob?: Blob): FileMetadata {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = blob?.type ?? getMimeFromExtension(extension);

  // AWS Translate Document API supports these formats directly
  const awsDocumentFormats = ['docx', 'pptx', 'xlsx', 'html', 'txt'];
  const supportsDirectTranslation = awsDocumentFormats.includes(extension);
  
  // All supported formats for extraction + translation
  const translatableFormats = [
    'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 
    'html', 'htm', 'txt', 'rtf', 'csv', 'json', 'md', 'markdown'
  ];
  
  return {
    mimeType,
    extension,
    isDocument: translatableFormats.includes(extension),
    canTranslate: translatableFormats.includes(extension),
    supportsDirectTranslation,
  };
}

function getMimeFromExtension(ext: string): string {
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
    html: 'text/html',
    htm: 'text/html',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    csv: 'text/csv',
    json: 'application/json',
    md: 'text/markdown',
    rtf: 'application/rtf',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

/**
 * Download file from Supabase storage or URL
 */
async function downloadFile(
  fileUrl: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Blob> {
  try {
    const url = new URL(fileUrl);
    
    if (url.protocol === 'blob:') {
      const response = await fetch(fileUrl);
      return await response.blob();
    }
    
    if (url.pathname.includes('/storage/v1/object/')) {
      const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.*)/);
      if (match?.[2]) {
        const storagePath = decodeURIComponent(match[2].split('?')[0]);
        const { data: fileData, error } = await supabase.storage
          .from('chat-files')
          .download(storagePath);
        
        if (error) throw new Error(`Storage download failed: ${error.message}`);
        return fileData;
      }
    }
    
    // Fallback to direct fetch
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.blob();
  } catch (error) {
    throw new Error(
      `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function translateDocumentWithAWS(input: TranslateDocumentInput) {
  try {
    const supabase = await createClient(input.accessToken);

    // 1. Check for cached translation
    const { data: messageData } = await supabase
      .from('messages')
      .select('content, variants')
      .eq('id', input.messageId)
      .single();

    if (!messageData) {
      throw new Error('Message not found');
    }

    const cacheKey = `aws_batch_${input.targetLanguage}`;
    if (messageData.variants?.[cacheKey]?.downloadUrl) {
      // Validate cached URL is still valid
      try {
        const response = await fetch(messageData.variants[cacheKey].downloadUrl, {
          method: 'HEAD',
        });
        if (response.ok) {
          return {
            success: true,
            downloadUrl: messageData.variants[cacheKey].downloadUrl,
            cached: true,
          };
        }
      } catch {
        // Cache invalid, proceed with new translation
      }
    }

    // 2. Download original file
    const fileBlob = await downloadFile(input.fileUrl, supabase);
    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    
    // 3. Validate file type
    const fileName = messageData.content || 'document';
    const fileMetadata = detectFileType(fileName, fileBlob);
    
    if (!fileMetadata.canTranslate) {
      throw new Error(`File type .${fileMetadata.extension} is not supported for translation`);
    }
    
    // 4. Start AWS batch translation job
    const jobId = await documentTranslator.startTranslationJob(
      fileBuffer,
      fileName,
      fileMetadata.mimeType,
      input.targetLanguage,
      input.sourceLanguage
    );

    // 5. Store job ID for tracking
    await supabase
      .from('messages')
      .update({
        variants: {
          ...messageData.variants,
          [`${cacheKey}_job`]: {
            jobId,
            status: 'IN_PROGRESS',
            startedAt: new Date().toISOString(),
          },
        },
      })
      .eq('id', input.messageId);

    return {
      success: true,
      jobId,
      status: 'IN_PROGRESS',
      message: 'Translation started. This may take a few minutes.',
    };
  } catch (error) {
    console.error('AWS translation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed',
    };
  }
}

// Separate action to check job status
export async function checkTranslationStatus(
  jobId: string,
  messageId: string,
  targetLanguage: string,
  accessToken?: string
) {
  try {
    const result = await documentTranslator.checkJobStatus(jobId);
    
    if (result.status === 'COMPLETED' && result.downloadUrl) {
      // Update cache with completed translation
      const supabase = await createClient(accessToken);
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