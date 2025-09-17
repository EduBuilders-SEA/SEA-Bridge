'use server';

import { translateDocument as translateDocumentFlow } from '@/ai/flows/translate-document';
import { DoclingDocumentParser } from '@/lib/document/docling-parser';
import { getFileExtension } from '@/lib/document/file-utils';
import { DocumentParser } from '@/lib/document/parser';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const _TranslateDocumentActionSchema = z.object({
  fileUrl: z.string(),
  targetLanguage: z.string(),
  contactId: z.string(),
  messageId: z.string(),
  sourceLanguage: z.string().optional(),
  accessToken: z.string().optional(),
  onProgress: z.function().args(z.number()).returns(z.void()).optional(),
});

export type TranslateDocumentInput = z.infer<
  typeof _TranslateDocumentActionSchema
>;

interface FileMetadata {
  mimeType: string;
  extension: string;
  isDocument: boolean;
  canTranslate: boolean;
}

/**
 * Enhanced file path extraction with blob URL support
 */
function extractStoragePath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);

    // Handle blob URLs - these can't be used for storage download
    if (url.protocol === 'blob:') {
      return null;
    }

    // Check if it's a Supabase storage URL
    if (url.pathname.includes('/storage/v1/object/')) {
      // Extract everything after the bucket name
      const match = url.pathname.match(
        /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.*)/
      );
      if (match?.[2]) {
        return decodeURIComponent(match[2].split('?')[0]);
      }
    }

    // If it's a relative path or direct storage path
    if (!url.protocol || url.protocol === 'file:') {
      return fileUrl;
    }

    throw new Error('Invalid storage URL format');
  } catch {
    // Assume it's already a storage path or extract from simple URL
    const parts = fileUrl.split('/');
    return parts[parts.length - 1] || null;
  }
}

/**
 * Download file from either Supabase storage or blob URL
 */
async function downloadFile(
  fileUrl: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Blob> {
  const storagePath = extractStoragePath(fileUrl);

  if (storagePath) {
    // Download from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('chat-files')
      .download(storagePath);

    if (downloadError) {
      throw new Error(
        `Failed to download from storage: ${downloadError.message}`
      );
    }

    return fileData;
  } else {
    // Handle blob URL or direct URL download
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      throw new Error(
        `Failed to fetch file from URL: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }
}

/**
 * File type detection and validation using Docling
 */
function detectFileType(fileName: string, blob?: Blob): FileMetadata {
  const extension = getFileExtension(fileName);
  const mimeType = blob?.type ?? getMimeFromExtension(extension);

  const canTranslate = DoclingDocumentParser.isSupportedByDocling(
    fileName,
    mimeType
  );

  return {
    mimeType,
    extension,
    isDocument: canTranslate,
    canTranslate,
  };
}

function getMimeFromExtension(ext: string): string {
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    odt: 'application/vnd.oasis.opendocument.text',
    rtf: 'application/rtf',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    html: 'text/html',
    htm: 'text/html',
    csv: 'text/csv',
    json: 'application/json',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

/**
 * Stream large documents in chunks
 */
async function streamTranslateDocument(
  textContent: string,
  targetLanguage: string,
  sourceLanguage?: string,
  onProgress?: (percent: number) => void
): Promise<{
  translatedContent: string;
  wordCount: number;
  processingTime: number;
  model: string;
}> {
  const CHUNK_SIZE = 50000; // ~50KB chunks

  if (textContent.length < CHUNK_SIZE) {
    // Small file, translate normally
    onProgress?.(50);
    const result = await translateDocumentFlow({
      documentContent: textContent,
      targetLanguage,
      sourceLanguage,
      preserveFormatting: true,
      maxChunkSize: 2000,
    });
    onProgress?.(100);
    return result;
  }

  // Large file, translate in chunks
  const chunks = [];
  const totalChunks = Math.ceil(textContent.length / CHUNK_SIZE);

  for (let i = 0; i < textContent.length; i += CHUNK_SIZE) {
    const chunk = textContent.slice(
      i,
      Math.min(i + CHUNK_SIZE, textContent.length)
    );
    const chunkIndex = Math.floor(i / CHUNK_SIZE);

    const translated = await translateDocumentFlow({
      documentContent: chunk,
      targetLanguage,
      sourceLanguage,
      preserveFormatting: true,
      maxChunkSize: CHUNK_SIZE,
    });

    chunks.push(translated.translatedContent);

    // Update progress
    const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
    onProgress?.(progress);

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return {
    translatedContent: chunks.join(' '),
    wordCount: chunks.reduce(
      (total, chunk) => total + (chunk.match(/\s+/g)?.length ?? 0),
      0
    ),
    processingTime: Date.now(),
    model: 'chunked-translation',
  };
}

export async function translateDocumentAction(input: TranslateDocumentInput) {
  try {
    const supabase = await createClient(input.accessToken);

    console.log('🌍 Starting document translation:', {
      fileUrl: input.fileUrl,
      targetLanguage: input.targetLanguage,
      messageId: input.messageId,
    });

    // Get file name from message or URL
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select('content, variants')
      .eq('id', input.messageId)
      .limit(1)
      .maybeSingle();

    console.log('Queried messageData:', messageData, 'Error:', messageError);

    if (messageError) {
      throw new Error(`Failed to fetch message: ${messageError.message}`);
    }

    if (!messageData) {
      throw new Error('Message not found');
    }

    // Clean the filename: remove leading emoji and trailing size info
    const rawFileName = messageData.content || 'document';
    const fileName = rawFileName
      .replace(/^(📎\s*)/, '')
      .replace(/\s*\(\d+(\.\d+)?\w+\)$/, '')
      .trim();

    console.log('📂 Processing file:', fileName);

    // Handle "Download Original" case efficiently
    if (input.targetLanguage === '') {
      console.log('⏩ Handling Download Original request.');
      return {
        success: true,
        downloadUrl: input.fileUrl, // Return the original signed URL
        fileName,
        cached: true,
      };
    }

    // Check for existing translation first
    if (messageData?.variants) {
      const existingTranslation =
        messageData.variants[`translated_${input.targetLanguage}`];

      if (existingTranslation?.downloadUrl) {
        console.log('✅ Found existing translation, checking validity...');

        // Try to create a fresh signed URL for the existing translation
        try {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('chat-files')
            .createSignedUrl(
              existingTranslation.filePath || existingTranslation.url,
              3600
            );

          if (!urlError && urlData?.signedUrl) {
            console.log('✅ Using cached translation');
            return {
              success: true,
              downloadUrl: urlData.signedUrl,
              fileName: existingTranslation.fileName,
              wordCount: existingTranslation.wordCount,
              processingTime: existingTranslation.processingTime,
              model: existingTranslation.model,
              cached: true,
            };
          }
        } catch (_cachedError) {
          console.warn(
            '⚠️ Cached translation invalid, proceeding with new translation'
          );
        }
      }
    }

    // Download file using enhanced method
    const fileData = await downloadFile(input.fileUrl, supabase);
    console.log('📥 File downloaded successfully, size:', fileData.size);

    // Validate file type
    const fileMetadata = detectFileType(fileName, fileData);

    if (!fileMetadata.canTranslate) {
      throw new Error(
        `File type .${
          fileMetadata.extension
        } is not supported for translation. ${DoclingDocumentParser.getSupportedFormatsMessage()}`
      );
    }

    // Extract text content using enhanced Docling parser
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const extractedContent = await DocumentParser.extractContent(
      buffer,
      fileMetadata.mimeType,
      fileName
    );

    const textContent = extractedContent.text;

    if (!textContent || textContent.trim().length === 0) {
      throw new Error('Could not extract text from document');
    }

    console.log('📝 Text extracted, length:', textContent.length);

    // Translate the document (with chunking for large files)
    input.onProgress?.(10);
    const result = await streamTranslateDocument(
      textContent,
      input.targetLanguage,
      input.sourceLanguage,
      (progress) => input.onProgress?.(10 + progress * 0.7) // 10% to 80%
    );

    input.onProgress?.(85);

    // Create translated file and upload
    const timestamp = Date.now();
    const translatedFileName = `translated_${input.targetLanguage}_${timestamp}_${fileName}`;

    // Generate a safe path for storage
    const contactPrefix = input.contactId.slice(0, 8); // First 8 chars of contact ID
    const translatedFilePath = `${contactPrefix}/translations/${translatedFileName}`;

    const translatedBlob = new Blob([result.translatedContent], {
      type: 'text/plain; charset=utf-8',
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(translatedFilePath, translatedBlob, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Translation upload error:', uploadError);
      throw new Error('Failed to save translated document');
    }

    input.onProgress?.(90);

    // Generate signed URL for download
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('chat-files')
      .createSignedUrl(uploadData.path, 3600); // 1 hour expiry

    if (urlError) {
      console.warn('⚠️ Could not create download URL:', urlError);
    }

    // Update message with translation metadata including parsing info
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        variants: {
          ...messageData?.variants,
          [`translated_${input.targetLanguage}`]: {
            content: result.translatedContent,
            fileName: translatedFileName,
            filePath: uploadData.path,
            downloadUrl: signedUrlData?.signedUrl,
            wordCount: result.wordCount,
            processingTime: result.processingTime,
            model: result.model,
            parsingMethod: extractedContent.metadata?.extractionMethod,
            originalFormat: extractedContent.metadata?.originalFormat,
            completedAt: new Date().toISOString(),
          },
        },
      })
      .eq('id', input.messageId);

    if (updateError) {
      console.warn('⚠️ Could not update message variants:', updateError);
    }

    input.onProgress?.(100);

    return {
      success: true,
      translatedContent: result.translatedContent,
      downloadUrl: signedUrlData?.signedUrl,
      fileName: translatedFileName,
      wordCount: result.wordCount,
      processingTime: result.processingTime,
      model: result.model,
      parsingMethod: extractedContent.metadata?.extractionMethod,
    };
  } catch (error) {
    console.error('❌ Document translation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed',
    };
  }
}
