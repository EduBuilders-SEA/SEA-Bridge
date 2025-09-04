import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand, MediaFormat } from '@aws-sdk/client-transcribe';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface TranscribeConfig {
  region: string;
  bucketName: string;
  profile?: string;
}

class AWSTranscribeService {
  private transcribeClient: TranscribeClient;
  private s3Client: S3Client;
  private config: Required<TranscribeConfig>;

  constructor(config: TranscribeConfig) {
    this.config = {
      region: config.region,
      bucketName: config.bucketName,
      profile: config.profile || 'default',
    };

    this.transcribeClient = new TranscribeClient({
      region: this.config.region,
    });

    this.s3Client = new S3Client({
      region: this.config.region,
    });
  }

  async transcribeAudio(audioDataUri: string): Promise<string> {
    try {
      // Extract audio data from data URI
      const audioData = this.extractAudioData(audioDataUri);
      
      // Upload audio to S3
      const s3Key = `audio-transcribe/${Date.now()}-audio.${this.getFileExtension(audioDataUri)}`;
      await this.uploadToS3(audioData, s3Key);

      // Start transcription job
      const jobName = `transcribe-job-${Date.now()}`;
      const transcriptionUri = `s3://${this.config.bucketName}/${s3Key}`;

      const startCommand = new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: 'en-US', // You might want to make this configurable
        MediaFormat: this.getMediaFormat(audioDataUri),
        Media: {
          MediaFileUri: transcriptionUri,
        },
      });

      await this.transcribeClient.send(startCommand);

      // Poll for completion
      const transcriptionResult = await this.waitForTranscriptionCompletion(jobName);
      
      return transcriptionResult;
    } catch (error) {
      throw new Error(`Failed to transcribe audio: ${error}`);
    }
  }

  private extractAudioData(dataUri: string): Buffer {
    const base64Data = dataUri.split(',')[1];
    return Buffer.from(base64Data, 'base64');
  }

  private getFileExtension(dataUri: string): string {
    const mimeType = dataUri.match(/data:([^;]+);/)?.[1];
    switch (mimeType) {
      case 'audio/wav':
        return 'wav';
      case 'audio/mpeg':
        return 'mp3';
      case 'audio/mp4':
        return 'mp4';
      case 'audio/webm':
        return 'webm';
      default:
        return 'wav';
    }
  }

  private getMediaFormat(dataUri: string): MediaFormat {
    const mimeType = dataUri.match(/data:([^;]+);/)?.[1];
    switch (mimeType) {
      case 'audio/wav':
        return MediaFormat.WAV;
      case 'audio/mpeg':
        return MediaFormat.MP3;
      case 'audio/mp4':
        return MediaFormat.MP4;
      case 'audio/webm':
        return MediaFormat.WEBM;
      default:
        return MediaFormat.WAV;
    }
  }

  private async uploadToS3(audioData: Buffer, key: string): Promise<void> {
    const putCommand = new PutObjectCommand({
      Bucket: this.config.bucketName,
      Key: key,
      Body: audioData,
    });

    await this.s3Client.send(putCommand);
  }

  private async waitForTranscriptionCompletion(jobName: string): Promise<string> {
    const maxAttempts = 30; // 5 minutes max wait time
    const pollInterval = 10000; // 10 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const getCommand = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      });

      const response = await this.transcribeClient.send(getCommand);
      const job = response.TranscriptionJob;

      if (job?.TranscriptionJobStatus === 'COMPLETED') {
        const transcriptUri = job.Transcript?.TranscriptFileUri;
        if (transcriptUri) {
          return await this.fetchTranscriptionResult(transcriptUri);
        }
        throw new Error('Transcription completed but no transcript URI found');
      } else if (job?.TranscriptionJobStatus === 'FAILED') {
        throw new Error(`Transcription job failed: ${job.FailureReason}`);
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Transcription job timed out');
  }

  private async fetchTranscriptionResult(transcriptUri: string): Promise<string> {
    try {
      const response = await fetch(transcriptUri);
      const transcriptData = await response.json();
      
      // Extract the transcript text from the AWS Transcribe response
      const transcript = transcriptData.results?.transcripts?.[0]?.transcript;
      
      if (!transcript) {
        throw new Error('No transcript found in response');
      }
      
      return transcript;
    } catch (error) {
      throw new Error(`Failed to fetch transcription result: ${error}`);
    }
  }
}

// Export a configured instance
export const transcribeService = new AWSTranscribeService({
  region: process.env.AWS_REGION || 'us-east-1',
  bucketName: process.env.AWS_S3_TRANSCRIBE_BUCKET || 'sea-bridge-transcribe',
});

export async function transcribeAudioWithAWSTranscribe(audioDataUri: string): Promise<string> {
  return transcribeService.transcribeAudio(audioDataUri);
}