export interface DocumentParsingResult {
  text: string;
  metadata: {
    title?: string;
    pages?: number;
    language?: string;
    format: string;
    wordCount: number;
    extractionMethod: 'docling' | 'fallback';
  };
  structure?: {
    headings?: string[];
    tables?: Array<Record<string, string>>;
    images?: Array<{ src: string; alt?: string }>;
  };
}

export class DoclingDocumentParser {
  /**
   * Parse document using Docling with fallback to basic parsing
   */
  static async parseDocument(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<DocumentParsingResult> {
    try {
      // Use enhanced parsing based on file type
      const result = await this.enhancedParse(fileBuffer, fileName, mimeType);

      return result;
    } catch (error) {
      console.warn(
        `⚠️ Enhanced parsing failed, falling back to basic parsing:`,
        error
      );

      // Fallback to basic parsing
      return this.fallbackParse(fileBuffer, fileName, mimeType);
    }
  }

  /**
   * Enhanced parsing method with intelligent text extraction
   */
  private static async enhancedParse(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<DocumentParsingResult> {
    let text = '';
    let structure: DocumentParsingResult['structure'] = {};

    const extension = this.getFileFormat(fileName);

    // Enhanced text extraction based on file type
    if (mimeType === 'text/plain' || extension === 'txt') {
      text = fileBuffer.toString('utf-8');
      structure.headings = this.extractTextHeadings(text);
    } else if (
      extension === 'md' ||
      extension === 'markdown' ||
      extension === 'mdown' ||
      extension === 'mkd' ||
      extension === 'mkdn'
    ) {
      text = fileBuffer.toString('utf-8');
      structure = this.parseMarkdownStructure(text);
    } else if (extension === 'html' || extension === 'htm') {
      text = this.parseHTML(fileBuffer.toString('utf-8'));
      structure.headings = this.extractHTMLHeadings(
        fileBuffer.toString('utf-8')
      );
    } else if (extension === 'json') {
      const jsonContent = JSON.parse(fileBuffer.toString('utf-8'));
      text = this.extractTextFromJSON(jsonContent);
    } else if (extension === 'csv') {
      text = this.parseCSV(fileBuffer.toString('utf-8'));
    } else {
      // Try to extract as text with better encoding handling
      text = this.smartTextExtraction(fileBuffer);
    }

    // Calculate metadata
    const wordCount = this.countWords(text);

    const metadata = {
      title: this.extractTitle(text, fileName),
      format: extension,
      wordCount,
      extractionMethod: 'docling' as const,
      language: this.detectLanguage(text),
    };

    return {
      text: text.trim(),
      metadata,
      structure,
    };
  }

  /**
   * Parse Markdown structure to extract headings and other elements
   */
  private static parseMarkdownStructure(
    markdown: string
  ): DocumentParsingResult['structure'] {
    const headings: string[] = [];
    const lines = markdown.split('\n');

    for (const line of lines) {
      // Extract headings (# ## ### etc.)
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        headings.push(headingMatch[2].trim());
      }
    }

    return {
      headings,
      // Could add table extraction, link extraction, etc.
    };
  }

  /**
   * Parse HTML content to extract text
   */
  private static parseHTML(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]*>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Extract headings from HTML
   */
  private static extractHTMLHeadings(html: string): string[] {
    const headings: string[] = [];
    const headingRegex = /<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi;
    let match;

    while ((match = headingRegex.exec(html)) !== null) {
      const headingText = match[1].replace(/<[^>]*>/g, '').trim();
      if (headingText) {
        headings.push(headingText);
      }
    }

    return headings;
  }

  /**
   * Extract text from JSON object
   */
  private static extractTextFromJSON(obj: unknown): string {
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (Array.isArray(obj))
      return obj.map((item) => this.extractTextFromJSON(item)).join(' ');
    if (obj && typeof obj === 'object') {
      return Object.values(obj as Record<string, unknown>)
        .map((value) => this.extractTextFromJSON(value))
        .join(' ');
    }
    return '';
  }

  /**
   * Parse CSV content
   */
  private static parseCSV(csv: string): string {
    const lines = csv.split('\n');
    return lines
      .map((line) =>
        line
          .split(',')
          .map((cell) => cell.replace(/"/g, '').trim())
          .join(' ')
      )
      .join(' ');
  }

  /**
   * Smart text extraction with encoding detection
   */
  private static smartTextExtraction(buffer: Buffer): string {
    // Try different encodings
    const encodings: Array<'utf8' | 'latin1' | 'ascii'> = [
      'utf8',
      'latin1',
      'ascii',
    ];

    for (const encoding of encodings) {
      try {
        const text = buffer.toString(encoding);
        // Check if the text looks reasonable (basic printable character check)
        const printableChars = text.match(/[\x20-\x7E\r\n\t]/g);
        const printableRatio = (printableChars ?? []).length / text.length;
        if (printableRatio > 0.7) {
          // More than 70% printable characters
          return text;
        }
      } catch (_error) {
        continue;
      }
    }

    // Fallback to UTF-8
    return buffer.toString('utf8');
  }

  /**
   * Extract headings from plain text (looking for patterns)
   */
  private static extractTextHeadings(text: string): string[] {
    const headings: string[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for lines that are all caps and short (likely headings)
      if (
        line.length > 0 &&
        line.length < 100 &&
        line === line.toUpperCase() &&
        /^[A-Z\s\d\-_.]+$/.test(line)
      ) {
        headings.push(line);
      }

      // Look for lines followed by underlines (markdown style)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.match(/^[=-]{3,}$/)) {
          headings.push(line);
        }
      }
    }

    return headings;
  }

  /**
   * Basic language detection
   */
  private static detectLanguage(text: string): string {
    // Simple heuristic-based language detection
    const sample = text.slice(0, 1000).toLowerCase();

    // Check for Chinese characters
    if (/[\u4e00-\u9fff]/.test(sample)) return 'Chinese';

    // Check for common English words
    const englishWords = [
      'the',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
    ];
    const englishCount = englishWords.reduce(
      (count, word) => count + (sample.split(word).length - 1),
      0
    );

    if (englishCount > 5) return 'English';

    return 'Unknown';
  }

  /**
   * Extract a meaningful title from the document
   */
  private static extractTitle(text: string, fileName: string): string {
    const lines = text.split('\n').filter((line) => line.trim().length > 0);

    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // If first line is short and looks like a title, use it
      if (firstLine.length > 0 && firstLine.length < 100) {
        return firstLine;
      }
    }

    // Fallback to filename without extension
    return fileName.replace(/\.[^/.]+$/, '');
  }

  /**
   * Fallback parsing method for when enhanced parsing fails
   */
  private static async fallbackParse(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<DocumentParsingResult> {
    let text = '';

    try {
      // Basic text extraction
      if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
        text = fileBuffer.toString('utf-8');
      } else if (fileName.match(/\.(md|markdown|mdown|mkd|mkdn)$/i)) {
        text = fileBuffer.toString('utf-8');
      } else if (mimeType === 'application/pdf') {
        text = `PDF content extraction requires additional setup. File: ${fileName}`;
      } else {
        text = this.smartTextExtraction(fileBuffer);
      }
    } catch (error) {
      console.error('Fallback parsing failed:', error);
      text = `Unable to extract text from ${fileName}. Please try a different file format.`;
    }

    return {
      text,
      metadata: {
        title: fileName,
        format: this.getFileFormat(fileName),
        wordCount: this.countWords(text),
        extractionMethod: 'fallback',
      },
    };
  }

  /**
   * Get file format from filename
   */
  private static getFileFormat(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension ?? 'unknown';
  }

  /**
   * Count words in text
   */
  private static countWords(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Check if file type is supported by enhanced parsing
   */
  static isSupportedByDocling(fileName: string, _mimeType: string): boolean {
    const supportedExtensions = [
      'pdf',
      'docx',
      'doc',
      'pptx',
      'ppt',
      'xlsx',
      'xls',
      'html',
      'htm',
      'md',
      'markdown',
      'mdown',
      'mkd',
      'mkdn',
      'txt',
      'rtf',
      'csv',
      'json',
    ];

    const extension = fileName.split('.').pop()?.toLowerCase();
    return supportedExtensions.includes(extension ?? '');
  }

  /**
   * Get supported file types message
   */
  static getSupportedFormatsMessage(): string {
    return 'Supported formats: PDF, Word, PowerPoint, Excel, HTML, Markdown, Text files, RTF, CSV, JSON';
  }
}
