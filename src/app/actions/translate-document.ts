'use server'

import { documentTranslator } from '@/lib/aws/document-translator'
import { downloadFromS3, uploadToS3, getSignedDownloadUrl } from '@/lib/aws/s3-client'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const TranslateDocumentSchema = z.object({
  fileUrl: z.string().url(),
  targetLanguage: z.string(),
  sourceLanguage: z.string().optional(),
  fileName: z.string(),
})

export async function translateDocument(
  input: z.infer<typeof TranslateDocumentSchema>
) {
  try {
    const supabase = await createClient()
    
    // Step 1: Download file from Supabase Storage or S3
    let fileBuffer: Buffer
    let mimeType: string
    
    if (input.fileUrl.includes('supabase')) {
      // Download from Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(input.fileName)
      
      if (error) throw error
      fileBuffer = Buffer.from(await data.arrayBuffer())
      mimeType = data.type
    } else {
      // Download from S3
      const bucket = process.env.S3_BUCKET_NAME!
      const key = input.fileName
      fileBuffer = await downloadFromS3(bucket, key)
      
      // Determine mime type from extension
      const ext = input.fileName.split('.').pop()?.toLowerCase()
      mimeType = getMimeType(ext || '')
    }

    // Step 2: Translate document using Sea-Lion
    console.log(`🦁 Translating document to ${input.targetLanguage}...`)
    const translatedBuffer = await documentTranslator.translateDocument(
      fileBuffer,
      mimeType,
      input.targetLanguage,
      input.sourceLanguage
    )

    // Step 3: Upload translated document
    const translatedFileName = `translated_${input.targetLanguage}_${Date.now()}_${input.fileName}`
    
    if (process.env.USE_SUPABASE_STORAGE === 'true') {
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('documents')
        .upload(translatedFileName, translatedBuffer, {
          contentType: mimeType,
          upsert: false,
        })
      
      if (error) throw error
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(translatedFileName)
      
      return {
        success: true,
        downloadUrl: urlData.publicUrl,
        fileName: translatedFileName,
        model: 'sea-lion',
      }
    } else {
      // Upload to S3
      const bucket = process.env.S3_BUCKET_NAME!
      await uploadToS3(bucket, translatedFileName, translatedBuffer, mimeType)
      
      // Generate signed URL for download
      const downloadUrl = await getSignedDownloadUrl(bucket, translatedFileName)
      
      return {
        success: true,
        downloadUrl,
        fileName: translatedFileName,
        model: 'sea-lion',
      }
    }
  } catch (error) {
    console.error('Document translation error:', error)
    
    // Fallback to Gemini if Sea-Lion fails
    if (process.env.SEA_LION_FALLBACK_TO_GEMINI === 'true') {
      return translateDocumentWithGemini(input)
    }
    
    throw error
  }
}

async function translateDocumentWithGemini(
  input: z.infer<typeof TranslateDocumentSchema>
) {
  // Implement Gemini fallback
  console.log('Falling back to Gemini for document translation...')
  // ... Gemini implementation
  return {
    success: false,
    error: 'Gemini fallback not implemented',
  }
}

function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'pdf': 'application/pdf',
    'txt': 'text/plain',
  }
  
  return mimeTypes[extension] || 'application/octet-stream'
}