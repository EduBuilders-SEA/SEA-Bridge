import type { TranslateClient } from '@aws-sdk/client-translate';
import { TranslateTextCommand } from '@aws-sdk/client-translate';
import { getAwsLanguageCode, translateClient } from './translate-config';

export interface RealtimeTranslationResult {
  success: boolean;
  translatedText?: string;
  sourceLanguage?: string;
  targetLanguage: string;
  error?: string;
}

export class AWSRealtimeTranslator {
  private client: TranslateClient;

  constructor() {
    this.client = translateClient;
  }

  /**
   * Translate text in real-time using AWS Translate
   * Best for small text files (<5KB) that need instant results
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<RealtimeTranslationResult> {
    try {
      // Validate input size (AWS Translate real-time limit is 10,000 UTF-8 bytes)
      const textSizeBytes = new TextEncoder().encode(text).length;
      if (textSizeBytes > 10000) {
        return {
          success: false,
          targetLanguage,
          error:
            'Text too large for real-time translation. Use batch processing instead.',
        };
      }

      const targetCode = getAwsLanguageCode(targetLanguage);
      const sourceCode = sourceLanguage
        ? getAwsLanguageCode(sourceLanguage)
        : 'auto';

      console.warn('🚀 Starting real-time AWS translation:', {
        textLength: text.length,
        textSizeBytes,
        sourceCode,
        targetCode,
      });

      const command = new TranslateTextCommand({
        Text: text,
        SourceLanguageCode: sourceCode,
        TargetLanguageCode: targetCode,
        Settings: {
          Formality: 'FORMAL',
          Profanity: 'MASK',
        },
      });

      const response = await this.client.send(command);

      if (!response.TranslatedText) {
        return {
          success: false,
          targetLanguage,
          error: 'No translated text received from AWS',
        };
      }

      console.warn('✅ Real-time translation completed:', {
        originalLength: text.length,
        translatedLength: response.TranslatedText.length,
        detectedSourceLanguage: response.SourceLanguageCode,
      });

      return {
        success: true,
        translatedText: response.TranslatedText,
        sourceLanguage: response.SourceLanguageCode,
        targetLanguage: targetCode,
      };
    } catch (error) {
      console.error('❌ Real-time translation error:', error);

      let errorMessage = 'Translation failed';
      if (error instanceof Error) {
        // Handle specific AWS errors
        if (error.message.includes('UnsupportedLanguagePairException')) {
          errorMessage = `Translation from ${
            sourceLanguage ?? 'auto-detect'
          } to ${targetLanguage} is not supported`;
        } else if (error.message.includes('TextSizeLimitExceededException')) {
          errorMessage = 'Text is too large for real-time translation';
        } else if (error.message.includes('InvalidRequestException')) {
          errorMessage = 'Invalid translation request';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        targetLanguage,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if content is suitable for real-time translation
   */
  static isRealtimeSuitable(content: string, fileSize?: number): boolean {
    // Real-time limits
    const MAX_REALTIME_SIZE = 8000; // Conservative limit (AWS allows 10KB)
    const MAX_REALTIME_LINES = 100; // Reasonable line limit

    const contentSize = new TextEncoder().encode(content).length;
    const lineCount = content.split('\n').length;

    return (
      contentSize <= MAX_REALTIME_SIZE &&
      lineCount <= MAX_REALTIME_LINES &&
      (fileSize ? fileSize <= MAX_REALTIME_SIZE : true)
    );
  }

  /**
   * Split large text into chunks for real-time processing
   */
  static chunkTextForRealtime(text: string, maxChunkSize = 8000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split('\n\n');

    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const testChunk = currentChunk
        ? `${currentChunk}\n\n${paragraph}`
        : paragraph;
      const testSize = new TextEncoder().encode(testChunk).length;

      if (testSize <= maxChunkSize) {
        currentChunk = testChunk;
      } else {
        // Current chunk is full, save it and start new chunk
        if (currentChunk) {
          chunks.push(currentChunk);
        }

        // If single paragraph is too large, split by sentences
        if (new TextEncoder().encode(paragraph).length > maxChunkSize) {
          const sentences = paragraph.split('. ');
          let sentenceChunk = '';

          for (const sentence of sentences) {
            const testSentence = sentenceChunk
              ? `${sentenceChunk}. ${sentence}`
              : sentence;
            if (new TextEncoder().encode(testSentence).length <= maxChunkSize) {
              sentenceChunk = testSentence;
            } else {
              if (sentenceChunk) chunks.push(sentenceChunk);
              sentenceChunk = sentence;
            }
          }

          if (sentenceChunk) chunks.push(sentenceChunk);
          currentChunk = '';
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Translate text in chunks for real-time processing
   */
  async translateTextChunked(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
    onProgress?: (
      progress: number,
      currentChunk: number,
      totalChunks: number
    ) => void
  ): Promise<RealtimeTranslationResult> {
    try {
      const chunks = AWSRealtimeTranslator.chunkTextForRealtime(text);

      if (chunks.length === 1) {
        // Single chunk, use regular translation
        return this.translateText(text, targetLanguage, sourceLanguage);
      }

      console.warn(
        `🔄 Translating ${chunks.length} chunks for real-time processing`
      );

      const translatedChunks: string[] = [];
      let detectedSourceLanguage: string | undefined;

      for (let i = 0; i < chunks.length; i++) {
        const result = await this.translateText(
          chunks[i],
          targetLanguage,
          sourceLanguage
        );

        if (!result.success) {
          return result; // Return error immediately
        }

        if (result.translatedText) {
          translatedChunks.push(result.translatedText);
        }

        // Use detected language from first chunk for consistency
        if (i === 0 && result.sourceLanguage) {
          detectedSourceLanguage = result.sourceLanguage;
        }

        // Report progress
        const progress = ((i + 1) / chunks.length) * 100;
        onProgress?.(progress, i + 1, chunks.length);
      }

      return {
        success: true,
        translatedText: translatedChunks.join('\n\n'),
        sourceLanguage: detectedSourceLanguage,
        targetLanguage,
      };
    } catch (error) {
      console.error('❌ Chunked translation error:', error);
      return {
        success: false,
        targetLanguage,
        error:
          error instanceof Error ? error.message : 'Chunked translation failed',
      };
    }
  }
}

export const realtimeTranslator = new AWSRealtimeTranslator();
