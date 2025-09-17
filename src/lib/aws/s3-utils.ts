import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, TRANSLATION_BUCKETS } from './translate-config';

/**
 * Sanitize metadata value for S3 headers
 */
function sanitizeMetadataValue(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, '') // Keep only printable ASCII characters
    .replace(/[\r\n\t]/g, ' ') // Replace line breaks with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
    .substring(0, 2048); // AWS metadata value limit
}

export async function uploadToS3ForTranslation(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  jobId?: string
): Promise<string> {
  // Create unique job folder (AWS Translate requires folder structure)
  const folderPrefix =
    jobId ?? `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create a safe filename for the actual file
  const cleanFileName = fileName
    .replace(/^(📎\s*)/, '') // Remove attachment emoji
    .replace(/\s*\(\d+(\.\d+)?\s*(kb|mb|gb|bytes?)\)\s*$/i, '') // Remove size indicators
    .replace(/[^\w\-_.]/g, '_') // Replace unsafe characters
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .trim();

  // Ensure we have a valid filename
  const safeFileName = cleanFileName || 'document.txt';

  // AWS Translate requires files to be in a folder structure
  const s3Key = `${folderPrefix}/input/${safeFileName}`;

  // Sanitize filename for metadata (original name preserved in metadata)
  const sanitizedFileName = sanitizeMetadataValue(fileName);
  const uploadTime = new Date().toISOString();

  console.warn('S3 Upload for AWS Translate:', {
    originalFileName: fileName,
    folderPrefix,
    s3Key,
    sanitizedFileName,
    mimeType,
    fileSize: fileBuffer.length,
  });

  await s3Client.send(
    new PutObjectCommand({
      Bucket: TRANSLATION_BUCKETS.input,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
      Metadata: {
        'original-name': sanitizedFileName,
        'upload-time': uploadTime,
        'content-type': mimeType,
        'job-id': folderPrefix,
      },
    })
  );

  // Return the FOLDER path (not the file path) as AWS Translate expects
  const folderUri = `s3://${TRANSLATION_BUCKETS.input}/${folderPrefix}/input/`;

  console.warn('AWS Translate input folder URI:', folderUri);
  return folderUri;
}

// Rest of your existing functions...
export async function downloadFromS3(
  bucket: string,
  key: string
): Promise<Buffer> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error('No response body from S3');
  }

  const chunks: Uint8Array[] = [];
  const reader = response.Body.transformToWebStream().getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function getSignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function checkS3ObjectExists(
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}
