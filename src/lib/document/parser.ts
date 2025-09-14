import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface ExtractedContent {
  text: string;
  metadata: {
    type: 'text' | 'docx' | 'pdf' | 'xlsx';
    originalFormat?: string;
    sections?: Array<{
      title?: string;
      content: string;
    }>;
  };
}

export class DocumentParser {
  static async extractContent(
    buffer: Buffer,
    mimeType: string
  ): Promise<ExtractedContent> {
    if (mimeType.includes('word') || mimeType.includes('docx')) {
      return this.extractDocx(buffer);
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('xlsx')) {
      return this.extractExcel(buffer);
    } else if (mimeType.includes('pdf')) {
      return this.extractPdf(buffer);
    } else if (mimeType.includes('text')) {
      return this.extractText(buffer);
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
        sections,
      },
    };
  }

  private static async extractPdf(buffer: Buffer): Promise<ExtractedContent> {
    // For now, we'll return a placeholder for PDF files
    // TODO: Implement proper PDF extraction with pdfjs-dist
    console.log('PDF extraction temporarily disabled - returning placeholder');
    return {
      text: 'PDF translation is currently under development. Please use DOCX, XLSX, or TXT formats for now.',
      metadata: {
        type: 'pdf',
        originalFormat: 'pdf',
      },
    };
  }

  private static async extractText(buffer: Buffer): Promise<ExtractedContent> {
    return {
      text: buffer.toString('utf-8'),
      metadata: {
        type: 'text',
        originalFormat: 'text',
      },
    };
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
