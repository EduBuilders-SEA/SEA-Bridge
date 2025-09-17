'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const GetDownloadUrlSchema = z.object({
  messageId: z.string(),
  accessToken: z.string().optional(),
});

export type GetDownloadUrlInput = z.infer<typeof GetDownloadUrlSchema>;

/**
 * Generates a fresh, short-lived signed URL for a file associated with a message.
 */
export async function getDownloadUrlAction(input: GetDownloadUrlInput) {
  try {
    const supabase = await createClient(input.accessToken);

    // 1. Fetch the message to get the file path from variants or content
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select('content, variants')
      .eq('id', input.messageId)
      .single();

    if (messageError || !messageData) {
      throw new Error(
        `Failed to find message: ${messageError?.message ?? 'Not found'}`
      );
    }

    // Determine the file path. Check variants first, then the main content URL.
    // This logic should align with how file paths are stored.
    // Assuming the original file info is stored in a variant, or we extract from file_url.
    const originalVariant = messageData.variants?.original;
    let storagePath: string | null = null;

    if (
      typeof originalVariant === 'object' &&
      originalVariant !== null &&
      'filePath' in originalVariant &&
      typeof originalVariant.filePath === 'string'
    ) {
      storagePath = originalVariant.filePath;
    } else {
      // Fallback to extract from the content if it's a URL
      const urlMatch = messageData.content.match(/\/chat-files\/(.*)/);
      if (urlMatch?.[1]) {
        storagePath = urlMatch[1];
      }
    }

    if (!storagePath) {
      // As a last resort, let's try to get the file_url from the message
      const { data: fileUrlData, error: fileUrlError } = await supabase
        .from('messages')
        .select('file_url')
        .eq('id', input.messageId)
        .single();

      if (fileUrlError || !fileUrlData?.file_url) {
        throw new Error('File path could not be determined for this message.');
      }

      const url = new URL(fileUrlData.file_url);
      const match = url.pathname.match(
        /\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.*)/
      );
      if (match?.[1]) {
        storagePath = decodeURIComponent(match[1].split('?')[0]);
      } else {
        throw new Error('Could not extract storage path from file_url.');
      }
    }

    // 2. Create a new signed URL
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('chat-files')
      .createSignedUrl(storagePath, 60); // Expires in 60 seconds

    if (urlError) {
      throw new Error(`Could not create signed URL: ${urlError.message}`);
    }

    // 3. Clean the filename for download
    const cleanFileName = (messageData.content || 'document')
      .replace(/^(📎\s*)/, '')
      .replace(/\s*\(\d+(\.\d+)?\w+\)$/, '')
      .trim();

    return {
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      fileName: cleanFileName,
    };
  } catch (error) {
    console.error('❌ Get Download URL error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get link',
    };
  }
}
