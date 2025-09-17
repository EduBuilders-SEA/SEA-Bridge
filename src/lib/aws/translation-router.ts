import { AWSRealtimeTranslator } from './realtime-translate';

export interface TranslationRoute {
  method: 'realtime' | 'batch';
  reason: string;
  estimatedTime: string;
  formatPreserved: boolean;
}

export interface FileCharacteristics {
  content?: string;
  size?: number;
  extension?: string;
  mimeType?: string;
  lineCount?: number;
}

export class TranslationRouter {
  private static readonly REALTIME_SIZE_LIMIT = 8000; // bytes
  private static readonly REALTIME_LINE_LIMIT = 100;
  private static readonly BATCH_PREFERRED_EXTENSIONS = [
    '.docx',
    '.pdf',
    '.xlsx',
    '.pptx',
    '.odt',
    '.odp',
    '.ods',
  ];
  private static readonly STRUCTURED_FORMATS = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.spreadsheet',
  ];

  /**
   * Analyze file and determine optimal translation method
   */
  static analyzeFile(characteristics: FileCharacteristics): TranslationRoute {
    const { content, size, extension, mimeType, lineCount } = characteristics;

    // Rule 1: Structured documents always use batch for format preservation
    if (this.isStructuredDocument(extension, mimeType)) {
      return {
        method: 'batch',
        reason: 'Structured document requiring format preservation',
        estimatedTime: '5-30 minutes',
        formatPreserved: true,
      };
    }

    // Rule 2: Large files use batch processing
    if (size && size > this.REALTIME_SIZE_LIMIT) {
      return {
        method: 'batch',
        reason: 'File too large for real-time processing',
        estimatedTime: this.estimateBatchTime(size),
        formatPreserved: true,
      };
    }

    // Rule 3: Content analysis for text files
    if (content) {
      const contentSize = new TextEncoder().encode(content).length;
      const contentLines = content.split('\n').length;

      // Large text content uses batch
      if (contentSize > this.REALTIME_SIZE_LIMIT) {
        return {
          method: 'batch',
          reason: 'Text content exceeds real-time limit',
          estimatedTime: this.estimateBatchTime(contentSize),
          formatPreserved: true,
        };
      }

      // Too many lines might indicate complex formatting
      if (contentLines > this.REALTIME_LINE_LIMIT) {
        return {
          method: 'batch',
          reason: 'Complex text structure detected',
          estimatedTime: '2-10 minutes',
          formatPreserved: true,
        };
      }

      // Check if content is suitable for real-time
      if (AWSRealtimeTranslator.isRealtimeSuitable(content, size)) {
        return {
          method: 'realtime',
          reason: 'Small text file, optimal for instant translation',
          estimatedTime: '5-15 seconds',
          formatPreserved: false,
        };
      }
    }

    // Rule 4: Line count analysis (fallback)
    if (lineCount && lineCount > this.REALTIME_LINE_LIMIT) {
      return {
        method: 'batch',
        reason: 'High line count suggests complex formatting',
        estimatedTime: '2-10 minutes',
        formatPreserved: true,
      };
    }

    // Rule 5: Default based on file size estimate
    const estimatedSize =
      size ?? (content ? new TextEncoder().encode(content).length : 0);

    if (estimatedSize === 0) {
      // Unknown size, default to real-time for safety
      return {
        method: 'realtime',
        reason: 'Unknown file size, trying real-time first',
        estimatedTime: '5-15 seconds',
        formatPreserved: false,
      };
    }

    if (estimatedSize <= this.REALTIME_SIZE_LIMIT) {
      return {
        method: 'realtime',
        reason: 'Small file size, optimal for instant translation',
        estimatedTime: '5-15 seconds',
        formatPreserved: false,
      };
    }

    return {
      method: 'batch',
      reason: 'Default to batch processing for reliability',
      estimatedTime: this.estimateBatchTime(estimatedSize),
      formatPreserved: true,
    };
  }

  /**
   * Check if file is a structured document that requires format preservation
   */
  private static isStructuredDocument(
    extension?: string,
    mimeType?: string
  ): boolean {
    if (
      extension &&
      this.BATCH_PREFERRED_EXTENSIONS.includes(extension.toLowerCase())
    ) {
      return true;
    }

    if (mimeType && this.STRUCTURED_FORMATS.includes(mimeType)) {
      return true;
    }

    return false;
  }

  /**
   * Estimate batch processing time based on file size
   */
  private static estimateBatchTime(sizeBytes: number): string {
    // AWS Translate batch processing time estimation
    const sizeKB = sizeBytes / 1024;

    if (sizeKB < 50) {
      return '2-5 minutes';
    } else if (sizeKB < 200) {
      return '5-10 minutes';
    } else if (sizeKB < 500) {
      return '10-20 minutes';
    } else {
      return '20-30 minutes';
    }
  }

  /**
   * Get user-friendly explanation for the chosen method
   */
  static getMethodExplanation(route: TranslationRoute): string {
    switch (route.method) {
      case 'realtime':
        return `Quick Translation (${route.estimatedTime}): Your text will be translated instantly, but formatting may not be preserved. Perfect for simple text content.`;

      case 'batch':
        return `Professional Translation (${route.estimatedTime}): Your document will be processed with full format preservation. This takes longer but maintains your document's original structure and styling.`;

      default:
        return 'Translation method selected based on file characteristics.';
    }
  }

  /**
   * Get appropriate UI messages for each method
   */
  static getUIMessages(route: TranslationRoute) {
    if (route.method === 'realtime') {
      return {
        startMessage: 'Starting instant translation...',
        progressMessage: 'Translating your text...',
        successMessage: 'Translation completed!',
        loadingIcon: 'spinner' as const,
      };
    } else {
      return {
        startMessage: 'Starting professional translation...',
        progressMessage: 'Processing your document with format preservation...',
        successMessage:
          'Document translation completed with formatting preserved!',
        loadingIcon: 'document' as const,
      };
    }
  }

  /**
   * Validate if fallback is needed (realtime -> batch)
   */
  static shouldFallbackToBatch(error: string): boolean {
    const fallbackTriggers = [
      'Text too large for real-time translation',
      'TextSizeLimitExceededException',
      'text is too large',
    ];

    return fallbackTriggers.some((trigger) =>
      error.toLowerCase().includes(trigger.toLowerCase())
    );
  }
}

export const translationRouter = TranslationRouter;
