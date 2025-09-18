-- Enable voice messages in the messages table
-- This assumes your existing messages table has a message_type column and variants JSONB column

-- Update the check constraint to include 'voice' type if not already present
DO $$ 
BEGIN
  -- Check if the constraint exists and drop it if it does
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_message_type_check' 
    AND table_name = 'messages'
  ) THEN
    ALTER TABLE messages DROP CONSTRAINT messages_message_type_check;
  END IF;

  -- Add the updated constraint with voice support
  ALTER TABLE messages 
  ADD CONSTRAINT messages_message_type_check 
  CHECK (message_type = ANY (ARRAY['text'::text, 'voice'::text, 'image'::text, 'file'::text]));
  
  -- Create index for voice messages if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_messages_voice_type'
  ) THEN
    CREATE INDEX idx_messages_voice_type ON messages(message_type) WHERE message_type = 'voice';
  END IF;
END $$;

-- The variants JSONB column will store voice message data:
-- {
--   "audioDataUri": "data:audio/webm;base64,...",
--   "transcription": "Hello, how are you?",
--   "translatedContent": "Xin chào, bạn khỏe không?",
--   "originalLanguage": "English",
--   "translatedLanguage": "Vietnamese", 
--   "isTranscribing": false,
--   "duration": 5.2
-- }

-- Add comment to document the voice message variant structure
COMMENT ON COLUMN messages.variants IS 'JSONB storage for message variants including:
- Voice messages: audioDataUri, transcription, translatedContent, originalLanguage, translatedLanguage, isTranscribing, duration
- Text messages: translatedContent, originalLanguage, translatedLanguage, translationModel, simplifiedContent
- File/Image messages: summary, isSummarizing, translatedContent';