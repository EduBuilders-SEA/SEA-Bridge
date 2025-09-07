import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type PreserveFormat = "markdown" | "text";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? { 
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!, 
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! 
      }
    : undefined,
});

export function buildOutputKey(key: string, preserve: PreserveFormat): string {
  const ext = preserve === "markdown" ? "md" : "txt";
  return `${key}.translated.${ext}`;
}

export async function presignInOut(params: {
  bucket: string;
  key: string;
  preserve: PreserveFormat;
  expiresInSec?: number;
}) {
  const { bucket, key, preserve, expiresInSec = 900 } = params;
  const outputKey = buildOutputKey(key, preserve);
  const contentType = preserve === "markdown" ? "text/markdown" : "text/plain";

  const [inputUrl, outputUrl] = await Promise.all([
    getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSec }),
    getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: outputKey, ContentType: contentType }), { expiresIn: expiresInSec }),
  ]);

  return { inputUrl, outputUrl, outputKey, contentType };
}

export async function headExists(params: { bucket: string; key: string }): Promise<boolean> {
  const { bucket, key } = params;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function presignGet(params: { bucket: string; key: string; expiresInSec?: number }) {
  const { bucket, key, expiresInSec = 300 } = params;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSec });
}

export async function uploadToS3(file: File, key: string): Promise<void> {
  const arrayBuffer = await file.arrayBuffer();
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
    Body: new Uint8Array(arrayBuffer),
    ContentType: file.type,
  });
  
  await s3.send(command);
}