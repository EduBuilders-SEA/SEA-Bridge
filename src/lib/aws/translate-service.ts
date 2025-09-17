import {
  DescribeTextTranslationJobCommand,
  StartTextTranslationJobCommand,
  type JobStatus,
  type TextTranslationJobProperties,
} from '@aws-sdk/client-translate';
import { getSignedDownloadUrl, uploadToS3ForTranslation } from './s3-utils';
import {
  getAwsLanguageCode,
  translateClient,
  TRANSLATION_BUCKETS,
} from './translate-config';

export interface TranslationJobResult {
  jobId: string;
  status: JobStatus;
  outputUrl?: string;
  downloadUrl?: string;
  errorMessage?: string;
  progress?: number;
}

export class AWSDocumentTranslator {
  /**
   * Start an async batch translation job
   */
  async startTranslationJob(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    // Create unique job identifier
    const jobId = `job-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const jobName = `sea-bridge-${jobId}`;

    // Upload file to S3 input bucket in a folder structure (AWS Translate requirement)
    const inputFolderUri = await uploadToS3ForTranslation(
      fileBuffer,
      fileName,
      mimeType,
      jobId
    );

    // Prepare job parameters
    const targetCode = getAwsLanguageCode(targetLanguage);
    const sourceCode = sourceLanguage
      ? getAwsLanguageCode(sourceLanguage)
      : 'auto';

    console.warn('Starting AWS Translate job:', {
      jobName,
      inputUri: inputFolderUri,
      sourceCode,
      targetCode,
      mimeType,
    });

    const command = new StartTextTranslationJobCommand({
      JobName: jobName,
      InputDataConfig: {
        S3Uri: inputFolderUri, // This will be a folder path now
        ContentType: mimeType,
      },
      OutputDataConfig: {
        S3Uri: `s3://${TRANSLATION_BUCKETS.output}/${jobId}/output/`,
      },
      SourceLanguageCode: sourceCode,
      TargetLanguageCodes: [targetCode],
      DataAccessRoleArn: process.env.AWS_TRANSLATE_ROLE_ARN ?? '',
      Settings: {
        Formality: 'FORMAL', // For educational content
        Profanity: 'MASK',
      },
    });

    const response = await translateClient.send(command);

    if (!response.JobId) {
      throw new Error('Failed to start translation job');
    }

    return response.JobId;
  }

  /**
   * Check translation job status
   */
  async checkJobStatus(jobId: string): Promise<TranslationJobResult> {
    const command = new DescribeTextTranslationJobCommand({
      JobId: jobId,
    });

    const response = await translateClient.send(command);
    const job = response.TextTranslationJobProperties;

    if (!job) {
      throw new Error('Job not found');
    }

    const result: TranslationJobResult = {
      jobId,
      status: job.JobStatus ?? ('UNKNOWN' as JobStatus),
      progress: this.calculateProgress(job),
    };

    if (job.JobStatus === 'COMPLETED') {
      // Get the output file location
      const outputKey = await this.findOutputFile(job);
      if (outputKey) {
        result.outputUrl = `s3://${TRANSLATION_BUCKETS.output}/${outputKey}`;
        result.downloadUrl = await getSignedDownloadUrl(
          TRANSLATION_BUCKETS.output,
          outputKey,
          3600
        );
      }
    } else if (job.JobStatus === 'FAILED') {
      result.errorMessage = job.Message ?? 'Translation failed';
    }

    return result;
  }

  /**
   * Wait for job completion with progress updates
   */
  async waitForCompletion(
    jobId: string,
    onProgress?: (progress: number) => void,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<TranslationJobResult> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.checkJobStatus(jobId);

      if (onProgress && status.progress !== undefined) {
        onProgress(status.progress);
      }

      if (status.status === 'COMPLETED' || status.status === 'FAILED') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Translation job timed out');
  }

  /**
   * Calculate job progress percentage
   */
  private calculateProgress(job: TextTranslationJobProperties): number {
    if (job.JobStatus === 'COMPLETED') return 100;
    if (job.JobStatus === 'FAILED') return 0;
    if (job.JobStatus === 'IN_PROGRESS') {
      // Estimate based on time if AWS doesn't provide progress
      if (job.SubmittedTime) {
        const submitted = new Date(job.SubmittedTime).getTime();
        const now = Date.now();
        const elapsed = now - submitted;
        const estimatedDuration = 60000; // 1 minute estimate
        return Math.min(90, Math.floor((elapsed / estimatedDuration) * 90));
      }
      return 50; // Default progress for in-progress jobs
    }
    return 10; // SUBMITTED state
  }

  /**
   * Find the output file in S3
   */
  private async findOutputFile(
    job: TextTranslationJobProperties
  ): Promise<string | null> {
    // AWS Translate outputs to: output-bucket/job-name/account-id-TranslateText-job-id/target-language/original-filename
    if (!job.OutputDataConfig?.S3Uri) return null;

    const targetLang = job.TargetLanguageCodes?.[0] ?? 'en';
    const jobName = job.JobName ?? 'unknown';

    // Extract the job ID from the AWS job name (format: sea-bridge-job-xxxxx-yyyyy)
    const jobIdMatch = jobName.match(/sea-bridge-(job-[\w-]+)/);
    const localJobId = jobIdMatch ? jobIdMatch[1] : jobName;

    // AWS Translate creates a complex output path structure
    const outputKey = `${localJobId}/output/${
      process.env.AWS_ACCOUNT_ID ?? 'unknown'
    }-TranslateText-${job.JobId}/${targetLang}`;

    console.warn('Looking for AWS Translate output at:', outputKey);

    return outputKey;
  }
}

export const documentTranslator = new AWSDocumentTranslator();
