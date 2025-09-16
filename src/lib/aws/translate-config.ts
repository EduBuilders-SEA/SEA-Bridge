import { TranslateClient } from '@aws-sdk/client-translate';
import { S3Client } from '@aws-sdk/client-s3';

export const translateClient = new TranslateClient({
  region: process.env.AWS_TRANSLATE_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// S3 Buckets for translation
export const TRANSLATION_BUCKETS = {
  input: process.env.AWS_TRANSLATE_INPUT_BUCKET || 'sea-bridge-translate-input',
  output: process.env.AWS_TRANSLATE_OUTPUT_BUCKET || 'sea-bridge-translate-output',
};

// AWS Translate language codes
export const AWS_LANGUAGE_CODES: Record<string, string> = {
  'English': 'en',
  'Mandarin Chinese': 'zh',
  'Malay': 'ms',
  'Indonesian': 'id',
  'Thai': 'th',
  'Vietnamese': 'vi',
  'Tagalog': 'tl',
  'Tamil': 'ta',
  'Korean': 'ko',
  'Japanese': 'ja',
  'Hindi': 'hi',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Burmese': 'my',
  'Khmer': 'km',
  'Lao': 'lo',
};

// Document formats supported by AWS Translate batch API
export const AWS_SUPPORTED_FORMATS = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/html': 'html',
  'text/plain': 'txt',
  'application/pdf': 'pdf', // Supported in some regions
};

export function getAwsLanguageCode(language: string): string {
  return AWS_LANGUAGE_CODES[language] || 'auto';
}