'use server'

import { ai } from '@/ai/genkit'
import { z } from 'zod'

const _TranslateDocumentInputSchema = z.object({
  documentContent: z.string(),
  targetLanguage: z.string(),
  sourceLanguage: z.string().optional(),
  preserveFormatting: z.boolean().default(true),
  maxChunkSize: z.number().default(2000),
})
export type TranslateDocumentInput = z.infer<typeof _TranslateDocumentInputSchema>

const _TranslateDocumentOutputSchema = z.object({
  translatedContent: z.string(),
  wordCount: z.number(),
  detectedLanguage: z.string().optional(),
  processingTime: z.number(),
  model: z.enum(['sea-lion', 'gemini']),
})
export type TranslateDocumentOutput = z.infer<typeof _TranslateDocumentOutputSchema>

export async function translateDocument(input: TranslateDocumentInput): Promise<TranslateDocumentOutput> {
  const startTime = Date.now()
  
  // Try Ollama SEA-LION first (FAST!)
  try {
    const { seaLionOllama } = await import('@/lib/ollama/sea-lion-client')
    
    // Split document into chunks for SEA-LION processing
    const chunks = smartChunkDocument(input.documentContent, input.maxChunkSize)
    
    // Translate each chunk using existing translateMessage method
    const translatedChunks = await Promise.all(
      chunks.map(chunk => seaLionOllama.translateMessage(
        chunk,
        input.targetLanguage,
        input.sourceLanguage
      ))
    )
    
    const translatedContent = translatedChunks.join('\n\n')
    const processingTime = Date.now() - startTime
    
    return {
      translatedContent,
      wordCount: input.documentContent.split(/\s+/).length,
      detectedLanguage: 'auto-detected',
      processingTime,
      model: 'sea-lion',
    }
  } catch (error) {
    console.warn('Ollama SEA-LION document translation failed, falling back to Gemini:', error)
    
    // Gemini fallback with smart chunking
    try {
      const chunks = smartChunkDocument(input.documentContent, input.maxChunkSize)
      
      // Translate chunks in parallel for better performance
      const translatedChunks = await Promise.all(
        chunks.map((chunk, index) => translateDocumentChunkFallback({
          content: chunk,
          targetLanguage: input.targetLanguage,
          chunkIndex: index,
          totalChunks: chunks.length,
        }))
      )
      
      const translatedContent = translatedChunks
        .map(result => result.translation)
        .join('\n\n')
      
      const processingTime = Date.now() - startTime
      
      return {
        translatedContent,
        wordCount: input.documentContent.split(/\s+/).length,
        detectedLanguage: 'auto-detected',
        processingTime,
        model: 'gemini',
      }
    } catch (fallbackError) {
      console.error('All document translation failed:', fallbackError)
      throw new Error('Document translation unavailable')
    }
  }
}

function smartChunkDocument(text: string, maxSize: number): string[] {
  if (text.length <= maxSize) return [text]
  
  const chunks: string[] = []
  const paragraphs = text.split(/\n\s*\n/)
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = paragraph
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

// Gemini fallback for document chunks
const translateDocumentChunkPrompt = ai.definePrompt({
  name: 'translateDocumentChunkPrompt',
  input: { 
    schema: z.object({
      content: z.string(),
      targetLanguage: z.string(),
      chunkIndex: z.number(),
      totalChunks: z.number(),
    })
  },
  output: { 
    schema: z.object({ 
      translation: z.string() 
    })
  },
  prompt: `You are an expert translator specializing in educational documents for Southeast Asian schools.
Your task is to translate this document section into the target language while preserving all formatting and critical information.

**Document Translation Guidelines:**
1. Preserve ALL formatting (bullets, numbering, headers, structure)
2. Keep ALL specific information EXACTLY as written:
   - Dates (e.g., "November 5th", "11/05/2023")
   - Times (e.g., "3:00 PM", "15:00")
   - Names (e.g., "Mr. Chen", "Wei", "Mrs. Davison")
   - Locations (e.g., "Room 101", "Main Hall")
   - Monetary values (e.g., "$25", "500,000 VND")
   - File names (e.g., "Assignment_1.pdf")
   - Subject codes (e.g., "MATH101", "ENG-202")
3. Maintain professional educational tone
4. For Southeast Asian languages, use appropriate formal terminology
5. Preserve document structure and hierarchy

This is section {{chunkIndex}} of {{totalChunks}} sections.

Document Section:
"""
{{content}}
"""

Translate the above document section into {{targetLanguage}}:`,
})

const translateDocumentChunkFallback = ai.defineFlow(
  {
    name: 'translateDocumentChunkFallback',
    inputSchema: z.object({
      content: z.string(),
      targetLanguage: z.string(),
      chunkIndex: z.number(),
      totalChunks: z.number(),
    }),
    outputSchema: z.object({
      translation: z.string(),
    }),
  },
  async (input) => {
    const { output } = await translateDocumentChunkPrompt(input)
    if (!output) {
      throw new Error('Document chunk translation failed')
    }
    return output
  }
)
