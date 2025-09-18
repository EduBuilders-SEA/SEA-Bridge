import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  DescribeTextTranslationJobCommand,
  StartTextTranslationJobCommand,
  TranslateClient,
} from '@aws-sdk/client-translate';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface TranslationJobStatus {
  success: boolean;
  status: string;
  downloadUrl?: string;
  error?: string;
  errorMessage?: string;
  jobId: string;
  progress?: number;
}

// ✅ Add language code mapping to ensure proper AWS Translate codes
const LANGUAGE_CODE_MAP: Record<string, string> = {
  // Common language names to AWS codes
  tagalog: 'tl',
  filipino: 'tl',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  italian: 'it',
  portuguese: 'pt',
  chinese: 'zh',
  mandarin: 'zh',
  'chinese (mandarin)': 'zh',
  '中文 (mandarin)': 'zh',
  japanese: 'ja',
  korean: 'ko',
  arabic: 'ar',
  russian: 'ru',
  hindi: 'hi',
  english: 'en',
  // ISO codes should pass through as-is
  tl: 'tl',
  es: 'es',
  fr: 'fr',
  de: 'de',
  it: 'it',
  pt: 'pt',
  zh: 'zh',
  ja: 'ja',
  ko: 'ko',
  ar: 'ar',
  ru: 'ru',
  hi: 'hi',
  en: 'en',
  // --- Enhanced SEA & regional languages ---
  malay: 'ms',
  'bahasa melayu': 'ms',
  ms: 'ms',

  indonesian: 'id',
  'bahasa indonesia': 'id',
  id: 'id',

  tamil: 'ta',
  தமிழ்: 'ta',
  ta: 'ta',

  vietnamese: 'vi',
  'tiếng việt': 'vi',
  'tieng viet': 'vi',
  vi: 'vi',

  thai: 'th',
  ภาษาไทย: 'th',
  ไทย: 'th',
  th: 'th',

  burmese: 'my',
  myanmar: 'my',
  မြန်မာ: 'my',
  မြန်မာဘာသာ: 'my',
  my: 'my',

  khmer: 'km',
  ខ្មែរ: 'km',
  km: 'km',

  lao: 'lo',
  laotian: 'lo',
  ລາວ: 'lo',
  lo: 'lo',
};

/**
 * ✅ Helper function to normalize language codes for AWS Translate
 */
function normalizeLanguageCode(language: string): string {
  const normalized = language.toLowerCase().trim();
  const mapped = LANGUAGE_CODE_MAP[normalized];

  if (mapped) {
    return mapped;
  }

  // If it's already a valid 2-3 character code, use it
  if (/^[a-z]{2,3}$/.test(normalized)) {
    return normalized;
  }

  console.warn(`Unknown language: ${language}, falling back to 'auto'`);
  return 'auto';
}

// ✅ Background polling manager to prevent UI blocking
class BackgroundPollingManager {
  private static instance: BackgroundPollingManager;
  private activePolls = new Map<string, ReturnType<typeof setTimeout>>();
  private pollCallbacks = new Map<
    string,
    (status: TranslationJobStatus) => void
  >();

  static getInstance(): BackgroundPollingManager {
    if (!this.instance) {
      this.instance = new BackgroundPollingManager();
    }
    return this.instance;
  }

  startPolling(
    jobId: string,
    callback: (status: TranslationJobStatus) => void,
    _intervalMs: number = 30000 // 30 seconds default
  ) {
    // Stop existing polling for this job if any
    this.stopPolling(jobId);

    this.pollCallbacks.set(jobId, callback);

    const poll = async () => {
      try {
        const status = await documentTranslator.checkJobStatus(jobId);

        // Call the callback with the status
        callback(status);

        // Stop polling if job is complete or failed
        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          this.stopPolling(jobId);
          return;
        }

        // Continue polling with adaptive intervals
        const nextInterval = this.getAdaptiveInterval(status);
        const timeoutId = setTimeout(poll, nextInterval);
        this.activePolls.set(jobId, timeoutId);
      } catch (error) {
        console.error(`Polling error for job ${jobId}:`, error);
        // Continue polling even on error, but with longer interval
        const timeoutId = setTimeout(poll, 60000); // 1 minute on error
        this.activePolls.set(jobId, timeoutId);
      }
    };

    // Start first poll immediately
    poll();
  }

  stopPolling(jobId: string) {
    const timeoutId = this.activePolls.get(jobId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.activePolls.delete(jobId);
      this.pollCallbacks.delete(jobId);
    }
  }

  stopAllPolling() {
    for (const [jobId] of this.activePolls) {
      this.stopPolling(jobId);
    }
  }

  private getAdaptiveInterval(status: TranslationJobStatus): number {
    // Adaptive polling intervals based on job status
    switch (status.status) {
      case 'SUBMITTED':
        return 45000; // 45 seconds for new jobs
      case 'IN_PROGRESS':
        return 30000; // 30 seconds for active jobs
      default:
        return 60000; // 1 minute for unknown status
    }
  }
}

class DocumentTranslator {
  private translateClient!: TranslateClient;
  private s3Client!: S3Client;
  private inputBucket = 'sea-bridge-translate-input';
  private outputBucket = 'sea-bridge-translate-output';
  private pollingManager = BackgroundPollingManager.getInstance();

  constructor() {
    // Prevent client-side instantiation
    if (typeof window !== 'undefined') {
      throw new Error(
        'DocumentTranslator cannot be instantiated on client side. Use server actions instead.'
      );
    }
  }

  private initializeClients() {
    if (this.translateClient && this.s3Client) {
      return; // Already initialized
    }

    const region = process.env.AWS_REGION ?? 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID ?? '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';
    // const sessionToken = process.env.AWS_SESSION_TOKEN;

    // ✅ Debug credentials loading
    console.error('🔍 AWS Credentials Debug:', {
      region,
      hasAccessKey: !!accessKeyId,
      hasSecretKey: !!secretAccessKey,
      accessKeyPrefix: `${accessKeyId.substring(0, 8)}...`,
      secretKeyPrefix: `${secretAccessKey.substring(0, 8)}...`,
      isTemporaryCredentials: accessKeyId.startsWith('ASIA'),
    });

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS credentials are missing. Please check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.'
      );
    }

    const credentials = {
      accessKeyId,
      secretAccessKey,
    };

    this.translateClient = new TranslateClient({
      region,
      credentials,
    });

    this.s3Client = new S3Client({
      region,
      credentials,
    });
  }

  async startTranslationJob(
    fileBuffer: Buffer,
    originalFileName: string,
    mimeType: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    try {
      this.initializeClients();

      // ✅ Normalize language codes for AWS Translate
      const normalizedTargetLanguage = normalizeLanguageCode(targetLanguage);
      const normalizedSourceLanguage = sourceLanguage
        ? normalizeLanguageCode(sourceLanguage)
        : 'auto';

      console.warn('Language normalization:', {
        originalTarget: targetLanguage,
        normalizedTarget: normalizedTargetLanguage,
        originalSource: sourceLanguage,
        normalizedSource: normalizedSourceLanguage,
      });

      // Validate that we have a proper target language
      if (normalizedTargetLanguage === 'auto') {
        throw new Error(
          `Invalid target language: ${targetLanguage}. Please provide a valid language code.`
        );
      }

      // Generate unique job ID and folder
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 10);
      const jobId = `${timestamp}-${randomId}`;
      const folderPrefix = `job-${jobId}`;

      // Upload file to S3 input bucket
      const sanitizedFileName = originalFileName.replace(
        /[^a-zA-Z0-9.\-_]/g,
        ''
      );
      const s3Key = `${folderPrefix}/input/${sanitizedFileName}`;

      console.warn('S3 Upload for AWS Translate:', {
        originalFileName,
        folderPrefix,
        s3Key,
        sanitizedFileName,
        mimeType,
        fileSize: fileBuffer.length,
      });

      const uploadCommand = new PutObjectCommand({
        Bucket: this.inputBucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(uploadCommand);

      // Start AWS Translate job
      const inputUri = `s3://${this.inputBucket}/${folderPrefix}/input/`;
      const outputUri = `s3://${this.outputBucket}/${folderPrefix}/output/`;

      const translateCommand = new StartTextTranslationJobCommand({
        JobName: `sea-bridge-${jobId}`,
        InputDataConfig: {
          S3Uri: inputUri,
          ContentType: mimeType,
        },
        OutputDataConfig: {
          S3Uri: outputUri,
        },
        DataAccessRoleArn: process.env.AWS_TRANSLATE_ROLE_ARN ?? '',
        SourceLanguageCode: normalizedSourceLanguage,
        TargetLanguageCodes: [normalizedTargetLanguage], // ✅ Use normalized language code
      });

      console.warn('AWS Translate input folder URI:', inputUri);
      console.warn('Starting AWS Translate job:', {
        jobName: `sea-bridge-${jobId}`,
        inputUri,
        sourceCode: normalizedSourceLanguage,
        targetCode: normalizedTargetLanguage, // ✅ Log normalized code
        mimeType,
      });

      const result = await this.translateClient.send(translateCommand);
      if (!result.JobId) {
        throw new Error('Failed to get job ID from AWS Translate');
      }
      return result.JobId;
    } catch (error) {
      console.error('Error starting translation job:', error);
      throw error;
    }
  }

  // ✅ Non-blocking status check method
  async checkJobStatus(jobId: string): Promise<TranslationJobStatus> {
    try {
      this.initializeClients();

      const command = new DescribeTextTranslationJobCommand({ JobId: jobId });
      const result = await this.translateClient.send(command);

      if (!result.TextTranslationJobProperties) {
        throw new Error('Job properties not found');
      }

      const job = result.TextTranslationJobProperties;
      const status = job.JobStatus;

      if (status === 'COMPLETED' && job.OutputDataConfig?.S3Uri) {
        try {
          const downloadUrl = await this.findTranslatedFile(
            job.OutputDataConfig.S3Uri,
            jobId
          );

          if (downloadUrl) {
            return {
              success: true,
              status: 'COMPLETED',
              downloadUrl,
              jobId,
            };
          } else {
            console.warn(
              'No translated file found, falling back to original S3 URI'
            );
            return {
              success: true,
              status: 'COMPLETED',
              downloadUrl: job.OutputDataConfig.S3Uri,
              jobId,
            };
          }
        } catch (s3Error) {
          console.error('Failed to find translated file:', s3Error);

          return {
            success: true,
            status: 'COMPLETED',
            downloadUrl: job.OutputDataConfig.S3Uri,
            jobId,
          };
        }
      }

      return {
        success: true,
        status: status ?? 'UNKNOWN',
        jobId,
        ...(status === 'FAILED' && {
          errorMessage: job.Message ?? 'Translation job failed',
        }),
      };
    } catch (error) {
      console.error('Error checking job status:', error);
      return {
        success: false,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
        jobId,
      };
    }
  }

  // ✅ Start background polling for a job
  startBackgroundPolling(
    jobId: string,
    callback: (status: TranslationJobStatus) => void
  ) {
    this.pollingManager.startPolling(jobId, callback);
  }

  // ✅ Stop background polling for a job
  stopBackgroundPolling(jobId: string) {
    this.pollingManager.stopPolling(jobId);
  }

  private async findTranslatedFile(
    outputS3Uri: string,
    jobId: string
  ): Promise<string | null> {
    try {
      this.initializeClients();

      const outputPrefix = outputS3Uri.replace(
        `s3://${this.outputBucket}/`,
        ''
      );

      console.warn('🔍 Looking for translated files in:', {
        bucket: this.outputBucket,
        prefix: outputPrefix,
        jobId,
      });

      const listCommand = new ListObjectsV2Command({
        Bucket: this.outputBucket,
        Prefix: outputPrefix,
      });

      const listResult = await this.s3Client.send(listCommand);

      if (!listResult.Contents || listResult.Contents.length === 0) {
        console.warn('No files found in output folder');
        return null;
      }

      // Log all files for debugging
      console.warn(
        '📁 Found files:',
        listResult.Contents.map((obj) => ({
          key: obj.Key,
          size: obj.Size,
        }))
      );

      // Look for translated files (they have language code prefix)
      const translatedFile = listResult.Contents.find((obj) => {
        if (!obj.Key || !obj.Size || obj.Size === 0) return false;
        if (obj.Key.endsWith('/')) return false; // Skip directories

        // Skip metadata files
        if (obj.Key.includes('.auxiliary-translation-details.json'))
          return false;
        if (obj.Key.includes('.translation-statistics.json')) return false;
        if (obj.Key.includes('.details.json')) return false;
        if (obj.Key.includes('.statistics.json')) return false;

        const fileName = obj.Key.split('/').pop() ?? '';

        // AWS Translate prefixes files with language codes (e.g., "fr.document.txt")
        // Look for files that START with language codes
        const hasLanguagePrefix = /^[a-z]{2,3}\./.test(fileName);

        if (hasLanguagePrefix && obj.Size > 100) {
          console.warn('✅ Found file with language prefix:', fileName);
          return true;
        }

        // Fallback: look for files with good extensions
        const hasGoodExtension = [
          '.txt',
          '.md',
          '.docx',
          '.pdf',
          '.rtf',
          '.ppt',
          '.xls',
          '.xlsx',
          '.csv',
        ].some((ext) => fileName.toLowerCase().endsWith(ext));

        if (hasGoodExtension && obj.Size > 100) {
          console.warn('✅ Found file with good extension:', fileName);
          return true;
        }

        // Fallback: files without extension but substantial size
        if (!fileName.includes('.') && obj.Size > 500) {
          console.warn(
            '✅ Found substantial file without extension:',
            fileName
          );
          return true;
        }

        return false;
      });

      if (translatedFile?.Key) {
        const getObjectCommand = new GetObjectCommand({
          Bucket: this.outputBucket,
          Key: translatedFile.Key,
        });

        const signedUrl = await getSignedUrl(this.s3Client, getObjectCommand, {
          expiresIn: 86400, // 24 hours
        });

        console.warn('✅ Found translated file:', translatedFile.Key);
        return signedUrl;
      }

      // If no translated file found, try fallback
      console.warn('⚠️ No translated file found, trying fallback...');

      const fallbackFile = listResult.Contents.find((obj) => {
        if (!obj.Key || !obj.Size || obj.Size === 0) return false;
        if (obj.Key.endsWith('/')) return false;
        if (obj.Key.includes('.json')) return false;

        // Don't exclude language codes in fallback!
        return obj.Size > 10; // At least 10 bytes
      });

      if (fallbackFile?.Key) {
        const getObjectCommand = new GetObjectCommand({
          Bucket: this.outputBucket,
          Key: fallbackFile.Key,
        });

        const signedUrl = await getSignedUrl(this.s3Client, getObjectCommand, {
          expiresIn: 86400,
        });

        console.warn('⚠️ Using fallback file:', fallbackFile.Key);
        return signedUrl;
      }

      console.warn('❌ No suitable files found in translation output');
      return null;
    } catch (error) {
      console.error('Error finding translated file:', error);
      return null;
    }
  }
}

export const documentTranslator = new DocumentTranslator();
