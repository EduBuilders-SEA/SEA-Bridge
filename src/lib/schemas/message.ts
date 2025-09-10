import { z } from 'zod'

// ✅ Base message schema matching your database
export const MessageSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  message_type: z.enum(['text', 'voice', 'image', 'audio', 'document']).default('text'),
  contact_link_id: z.string().uuid(),
  sender_id: z.string(),
  sent_at: z.string(),
  variants: z.object({
    originalLanguage: z.string().optional(),
    translatedContent: z.string().optional(),
    translatedLanguage: z.string().optional(),
    audioUrl: z.string().optional(),
    transcription: z.string().optional(),
    simplifiedContent: z.string().optional(),
    isSimplifying: z.boolean().optional(),
    summary: z.string().optional(),
    isSummarizing: z.boolean().optional(),
    isTranslating: z.boolean().optional(),
    isTranscribing: z.boolean().optional(),
    audioDataUri: z.string().optional(),
  }).nullable().optional(),
  file_url: z.string().url().nullable().optional(),
})

// ✅ Database row schema (what comes from Supabase)
export const MessageRowSchema = MessageSchema.extend({
  sender: z.object({
    name: z.string().nullable(),
  }).nullable().optional(),
})

// ✅ UI-friendly schema with computed user field
export const ChatMessageSchema = MessageSchema.extend({
  user: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
})

// ✅ Input schema for sending messages
export const SendMessageSchema = z.object({
  contact_link_id: z.string().uuid(),
  content: z.string().min(1),
  message_type: z.enum(['text', 'voice', 'image', 'audio', 'document']).default('text'),
  variants: MessageSchema.shape.variants,
  file_url: z.string().url().nullable().optional(),
})

// ✅ Export types
export type Message = z.infer<typeof MessageSchema>
export type MessageRow = z.infer<typeof MessageRowSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
export type SendMessageData = z.infer<typeof SendMessageSchema>

// ✅ Transformation utility
export function transformMessageRow(row: MessageRow): ChatMessage {
  return ChatMessageSchema.parse({
    ...row,
    user: {
      id: row.sender_id,
      name: row.sender?.name ?? 'Unknown User',
    },
  })
}