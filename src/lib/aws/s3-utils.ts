import { PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, TRANSLATION_BUCKETS } from './translate-config';

export async function uploadToS3ForTranslation(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const key = `input/${Date.now()}-${fileName}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: TRANSLATION_BUCKETS.input,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    Metadata: {
      'original-name': fileName,
      'upload-time': new Date().toISOString(),
    },
  }));
  
  return `s3://${TRANSLATION_BUCKETS.input}/${key}`;
}

export async function downloadFromS3(
  bucket: string,
  key: string
): Promise<Buffer> {
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
  
  const chunks: Uint8Array[] = [];
  const reader = response.Body!.transformToWebStream().getReader();
  
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