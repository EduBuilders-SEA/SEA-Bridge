// import { invokeSeaLion } from './bedrock-client' // DISABLED: Using Ollama now
import { DocumentParser, type ExtractedContent } from '@/lib/document/parser'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import * as XLSX from 'xlsx'

export class SeaLionDocumentTranslator {
  private static readonly MAX_CHUNK_SIZE = 2000 // Characters per chunk

  async translateDocument(
    buffer: Buffer,
    mimeType: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<Buffer> {
    // Extract content
    const extracted = await DocumentParser.extractContent(buffer, mimeType)
    
    // Translate content
    const translatedContent = await this.translateExtractedContent(
      extracted,
      targetLanguage,
      sourceLanguage
    )
    
    // Reconstruct document in original format
    return this.reconstructDocument(translatedContent, mimeType)
  }

  private async translateExtractedContent(
    content: ExtractedContent,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<ExtractedContent> {
    if (content.metadata.sections) {
      // Translate structured content section by section
      const translatedSections = await Promise.all(
        content.metadata.sections.map(async (section) => ({
          title: section.title 
            ? await this.translateChunk(section.title, targetLanguage, sourceLanguage)
            : undefined,
          content: await this.translateLongText(section.content, targetLanguage, sourceLanguage),
        }))
      )

      return {
        text: translatedSections.map(s => s.content).join('\n'),
        metadata: {
          ...content.metadata,
          sections: translatedSections,
        },
      }
    } else {
      // Translate as single text
      const translatedText = await this.translateLongText(
        content.text,
        targetLanguage,
        sourceLanguage
      )

      return {
        text: translatedText,
        metadata: content.metadata,
      }
    }
  }

  private async translateLongText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    // Split into chunks if text is too long
    if (text.length <= SeaLionDocumentTranslator.MAX_CHUNK_SIZE) {
      return this.translateChunk(text, targetLanguage, sourceLanguage)
    }

    // Smart chunking: split by paragraphs or sentences
    const chunks = this.smartChunk(text)
    
    // Translate each chunk
    const translatedChunks = await Promise.all(
      chunks.map(chunk => this.translateChunk(chunk, targetLanguage, sourceLanguage))
    )

    return translatedChunks.join('\n\n')
  }

  private smartChunk(text: string): string[] {
    const chunks: string[] = []
    const paragraphs = text.split(/\n\n+/)
    
    let currentChunk = ''
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > SeaLionDocumentTranslator.MAX_CHUNK_SIZE) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        
        // If single paragraph is too long, split by sentences
        if (paragraph.length > SeaLionDocumentTranslator.MAX_CHUNK_SIZE) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
          let sentenceChunk = ''
          
          for (const sentence of sentences) {
            if (sentenceChunk.length + sentence.length > SeaLionDocumentTranslator.MAX_CHUNK_SIZE) {
              chunks.push(sentenceChunk.trim())
              sentenceChunk = sentence
            } else {
              sentenceChunk += ` ${  sentence}`
            }
          }
          
          if (sentenceChunk) {
            currentChunk = sentenceChunk
          }
        } else {
          currentChunk = paragraph
        }
      } else {
        currentChunk += `\n\n${  paragraph}`
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }
    
    return chunks
  }

  private async translateChunk(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string
  ): Promise<string> {
    const prompt = `Translate this educational document content from ${sourceLanguage || 'auto-detect'} to ${targetLanguage}.

CRITICAL INSTRUCTIONS:
1. Preserve ALL formatting (bullets, numbering, tables)
2. Keep ALL dates, times, names, locations EXACTLY as written
3. Maintain formal educational tone
4. For SEA languages, use appropriate educational terminology
5. Preserve any document structure markers

Content to translate:
"""
${text}
"""

Translation in ${targetLanguage}:`

    try {
      const { seaLionOllama } = await import('@/lib/ollama/sea-lion-client');
      const response = await seaLionOllama.generateResponse(prompt, 'document-translation');
      return this.cleanTranslation(response);
    } catch (error) {
      console.error('Document translation failed:', error);
      throw new Error('Document translation service unavailable');
    }
  }

  private cleanTranslation(text: string): string {
    return text
      .replace(/^Translation:?\s*/i, '')
      .replace(/^"""\s*/m, '')
      .replace(/\s*"""$/m, '')
      .trim()
  }

  private async reconstructDocument(
    content: ExtractedContent,
    mimeType: string
  ): Promise<Buffer> {
    if (mimeType.includes('docx')) {
      return this.createDocx(content)
    } else if (mimeType.includes('xlsx')) {
      return this.createExcel(content)
    } else {
      // Return as text for other formats
      return Buffer.from(content.text, 'utf-8')
    }
  }

  private async createDocx(content: ExtractedContent): Promise<Buffer> {
    const children: any[] = []

    if (content.metadata.sections) {
      for (const section of content.metadata.sections) {
        if (section.title) {
          children.push(
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_1,
            })
          )
        }
        
        // Split content by paragraphs
        const paragraphs = section.content.split('\n\n')
        for (const para of paragraphs) {
          children.push(
            new Paragraph({
              children: [new TextRun(para)],
            })
          )
        }
      }
    } else {
      // Simple text to docx
      const paragraphs = content.text.split('\n\n')
      for (const para of paragraphs) {
        children.push(
          new Paragraph({
            children: [new TextRun(para)],
          })
        )
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    })

    return Buffer.from(await Packer.toBuffer(doc))
  }

  private createExcel(content: ExtractedContent): Buffer {
    const workbook = XLSX.utils.book_new()

    if (content.metadata.sections) {
      for (const section of content.metadata.sections) {
        const sheetName = section.title || 'Sheet1'
        const data = section.content.split('\n').map(row => row.split(','))
        const worksheet = XLSX.utils.aoa_to_sheet(data)
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31))
      }
    } else {
      // Single sheet
      const data = content.text.split('\n').map(row => row.split(','))
      const worksheet = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Translated')
    }

    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))
  }
}

export const documentTranslator = new SeaLionDocumentTranslator()