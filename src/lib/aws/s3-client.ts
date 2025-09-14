import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function downloadFromS3(bucket: string, key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const response = await s3Client.send(command)
  const chunks: Uint8Array[] = []
  
  if (response.Body) {
    const reader = response.Body.transformToWebStream().getReader()
    let done = false
    
    while (!done) {
      const { value, done: readerDone } = await reader.read()
      if (value) chunks.push(value)
      done = readerDone
    }
  }
  
  return Buffer.concat(chunks)
}

export async function uploadToS3(
  bucket: string,
  key: string,
  content: Buffer,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: content,
    ContentType: contentType,
  })

  await s3Client.send(command)
  return `https://${bucket}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`
}

export async function getSignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(s3Client, command, { expiresIn })
}