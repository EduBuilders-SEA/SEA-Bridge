export interface FileMetadata {
  mimeType: string;
  extension: string;
  isDocument: boolean;
  canTranslate: boolean;
  supportsDirectTranslation?: boolean;
}

/**
 * Clean filename by removing emoji and size indicators
 */
export function cleanFileName(fileName: string): string {
  return fileName
    .replace(/^(📎\s*)/, '') // Remove attachment emoji
    .replace(/\s*\(\d+(\.\d+)?\s*(kb|mb|gb|bytes?)\)\s*$/i, '') // Remove size indicators
    .trim();
}

/**
 * Extract file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const cleanName = cleanFileName(fileName);
  return cleanName.split('.').pop()?.toLowerCase() ?? '';
}

/**
 * Get MIME type from file extension
 */
export function getMimeFromExtension(ext: string): string {
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
    csv: 'text/plain', // Treat as plain text for AWS
    json: 'text/plain', // Treat as plain text for AWS
    md: 'text/plain', // Treat as plain text for AWS
    markdown: 'text/plain', // Treat as plain text for AWS
    rtf: 'text/plain', // Treat as plain text for AWS
    odt: 'application/vnd.oasis.opendocument.text',
  };
  return mimeMap[ext] ?? 'application/octet-stream';
}

/**
 * Extract Supabase storage path from URL
 */
export function extractStoragePath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);

    if (url.protocol === 'blob:') {
      return null;
    }

    if (url.pathname.includes('/storage/v1/object/')) {
      const match = url.pathname.match(
        /\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.*)/
      );
      if (match?.[2]) {
        return decodeURIComponent(match[2].split('?')[0]);
      }
    }

    if (!url.protocol || url.protocol === 'file:') {
      return fileUrl;
    }

    throw new Error('Invalid storage URL format');
  } catch {
    const parts = fileUrl.split('/');
    return parts[parts.length - 1] || null;
  }
}

/**
 * Download file from Supabase storage or URL
 */
export async function downloadFile(
  fileUrl: string,
  supabase: any
): Promise<Blob> {
  const storagePath = extractStoragePath(fileUrl);

  if (storagePath) {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('chat-files')
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Failed to download from storage: ${downloadError.message}`);
    }

    return fileData;
  } else {
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