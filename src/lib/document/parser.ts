import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  DoclingDocumentParser,
  type DocumentParsingResult,
} from './docling-parser';

export interface ExtractedContent {
  text: string;
  metadata: {
    type: 'text' | 'docx' | 'pdf' | 'xlsx' | 'markdown' | 'html';
    originalFormat?: string;
    extractionMethod?: 'docling' | 'fallback' | 'legacy';
    wordCount?: number;
    title?: string;
    language?: string;
    sections?: Array<{
      title?: string;
      content: string;
    }>;
  };
}

export class DocumentParser {
  /**
   * Enhanced document parsing using Docling with fallback to legacy parsers
   */
  static async extractContent(
    buffer: Buffer,
    mimeType: string,
    fileName?: string
  ): Promise<ExtractedContent> {
    // Generate a filename if not provided
    if (!fileName) {
      fileName = `document.${this.getExtensionFromMimeType(mimeType)}`;
    }

    // Try enhanced parsing first using Docling
    try {
      if (DoclingDocumentParser.isSupportedByDocling(fileName, mimeType)) {
        const result = await DoclingDocumentParser.parseDocument(
          buffer,
          fileName,
          mimeType
        );

        return this.convertToExtractedContent(result, 'docling');
      }
    } catch (error) {
      console.warn(
        'Enhanced parsing failed, falling back to legacy parsers:',
        error
      );
    }

    // Fallback to legacy parsing methods
    return this.legacyExtractContent(buffer, mimeType, fileName);
  }

  /**
   * Convert DoclingDocumentParser result to ExtractedContent format
   */
  private static convertToExtractedContent(
    result: DocumentParsingResult,
    method: 'docling' | 'fallback'
  ): ExtractedContent {
    return {
      text: result.text,
      metadata: {
        type: this.mapFormatToType(result.metadata.format),
        originalFormat: result.metadata.format,
        extractionMethod: method,
        wordCount: result.metadata.wordCount,
        title: result.metadata.title,
        language: result.metadata.language,
        sections: result.structure?.headings?.map((heading) => ({
          title: heading,
          content: '', // Headings only for now
        })),
      },
    };
  }

  /**
   * Legacy content extraction methods
   */
  private static async legacyExtractContent(
    buffer: Buffer,
    mimeType: string,
    fileName?: string
  ): Promise<ExtractedContent> {
    if (mimeType.includes('word') || mimeType.includes('docx')) {
      return this.extractDocx(buffer);
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('xlsx')) {
      return this.extractExcel(buffer);
    } else if (mimeType.includes('pdf')) {
      return this.extractPdf(buffer);
    } else if (mimeType.includes('text') || fileName?.endsWith('.txt')) {
      return this.extractText(buffer);
    } else if (fileName?.match(/\.(md|markdown)$/i)) {
      return this.extractMarkdown(buffer);
    }

    throw new Error(`Unsupported document type: ${mimeType}`);
  }

  private static async extractDocx(buffer: Buffer): Promise<ExtractedContent> {
    const result = await mammoth.extractRawText({ buffer });

    // Also try to extract with structure
    const structured = await mammoth.convertToHtml({ buffer });

    return {
      text: result.value,
      metadata: {
        type: 'docx',
        originalFormat: 'docx',
        extractionMethod: 'legacy',
        wordCount: this.countWords(result.value),
        sections: this.parseHtmlToSections(structured.value),
      },
    };
  }

  private static async extractExcel(buffer: Buffer): Promise<ExtractedContent> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let fullText = '';
    const sections: Array<{ title?: string; content: string }> = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);

      sections.push({
        title: sheetName,
        content: csv,
      });

      fullText += `\n=== ${sheetName} ===\n${csv}\n`;
    });

    return {
      text: fullText,
      metadata: {
        type: 'xlsx',
        originalFormat: 'xlsx',
        extractionMethod: 'legacy',
        wordCount: this.countWords(fullText),
        sections,
      },
    };
  }

  private static async extractPdf(_buffer: Buffer): Promise<ExtractedContent> {
    // For now, we'll return a placeholder for PDF files
    // TODO: Implement proper PDF extraction with pdfjs-dist
    return {
      text: 'PDF translation is currently under development. Please use DOCX, XLSX, or TXT formats for now.',
      metadata: {
        type: 'pdf',
        originalFormat: 'pdf',
        extractionMethod: 'legacy',
      },
    };
  }

  private static async extractText(buffer: Buffer): Promise<ExtractedContent> {
    const text = buffer.toString('utf-8');
    return {
      text,
      metadata: {
        type: 'text',
        originalFormat: 'text',
        extractionMethod: 'legacy',
        wordCount: this.countWords(text),
      },
    };
  }

  private static async extractMarkdown(
    buffer: Buffer
  ): Promise<ExtractedContent> {
    const text = buffer.toString('utf-8');
    const sections = this.parseMarkdownSections(text);

    return {
      text,
      metadata: {
        type: 'markdown',
        originalFormat: 'markdown',
        extractionMethod: 'legacy',
        wordCount: this.countWords(text),
        sections,
      },
    };
  }

  /**
   * Helper methods
   */
  private static getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'docx',
      'application/msword': 'doc',
      'text/plain': 'txt',
      'text/markdown': 'md',
      'application/rtf': 'rtf',
    };

    return mimeToExt[mimeType] ?? 'txt';
  }

  private static mapFormatToType(
    format: string
  ): ExtractedContent['metadata']['type'] {
    const formatMap: Record<string, ExtractedContent['metadata']['type']> = {
      pdf: 'pdf',
      docx: 'docx',
      doc: 'docx',
      xlsx: 'xlsx',
      xls: 'xlsx',
      md: 'markdown',
      markdown: 'markdown',
      html: 'html',
      htm: 'html',
      txt: 'text',
    };

    return formatMap[format.toLowerCase()] ?? 'text';
  }

  private static countWords(text: string): number {
    if (!text || typeof text !== 'string') return 0;
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  private static parseMarkdownSections(
    markdown: string
  ): Array<{ title?: string; content: string }> {
    const sections: Array<{ title?: string; content: string }> = [];
    const lines = markdown.split('\n');
    let currentSection: { title?: string; content: string } = { content: '' };

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        if (currentSection.content.trim()) {
          sections.push(currentSection);
        }
        currentSection = {
          title: headingMatch[2].trim(),
          content: '',
        };
      } else {
        currentSection.content += `${line}\n`;
      }
    }

    if (currentSection.content.trim()) {
      sections.push(currentSection);
    }

    return sections;
  }

  private static parseHtmlToSections(
    html: string
  ): Array<{ title?: string; content: string }> {
    // Simple HTML parsing for structure
    const sections: Array<{ title?: string; content: string }> = [];
    const lines = html.split('\n');

    let currentSection: { title?: string; content: string } = { content: '' };

    for (const line of lines) {
      if (line.includes('<h1>') || line.includes('<h2>')) {
        if (currentSection.content) {
          sections.push(currentSection);
        }
        const title = line.replace(/<[^>]*>/g, '').trim();
        currentSection = { title, content: '' };
      } else {
        const text = line.replace(/<[^>]*>/g, '').trim();
        if (text) {
          currentSection.content = `${currentSection.content}${text}\n`;
        }
      }
    }

    if (currentSection.content) {
      sections.push(currentSection);
    }

    return sections;
  }
}
