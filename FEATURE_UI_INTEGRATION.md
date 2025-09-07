# Document Translation Feature - UI Integration

## Chat Interface Integration

The document translation feature seamlessly integrates into the existing chat interface. Below is how it appears:

### 1. Teacher Sends Document

```
┌─────────────────────────────────────────────────┐
│ Teacher (You)                              3:45 PM │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📄 homework_assignment.pdf                       │ │
│ │ Click to download                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 2. Parent Receives Document (Before Translation)

```
┌─────────────────────────────────────────────────┐
│ Ms. Johnson                               3:45 PM │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📄 homework_assignment.pdf                       │ │
│ │ Click to download                                 │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ Translate Document                               │ │
│ │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ │ │
│ │ │ Vietnamese ▼│ │ Markdown ▼  │ │ Translate   │ │ │
│ │ └─────────────┘ └─────────────┘ └─────────────┘ │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 3. During Translation Process

```
┌─────────────────────────────────────────────────┐
│ Ms. Johnson                               3:45 PM │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📄 homework_assignment.pdf                       │ │
│ │ Click to download                                 │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ Translate Document                               │ │
│ │ ┌─────────────────────────────────────────────┐   │ │
│ │ │ ⟳ Translating...                           │   │ │
│ │ └─────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 4. Translation Complete

```
┌─────────────────────────────────────────────────┐
│ Ms. Johnson                               3:45 PM │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 📄 homework_assignment.pdf                       │ │
│ │ Click to download                                 │ │
│ │ ─────────────────────────────────────────────── │ │
│ │ Translate Document                               │ │
│ │ ┌─────────────────────────────────────────────┐   │ │
│ │ │ ✓ ⬇ Download Translation                   │   │ │
│ │ └─────────────────────────────────────────────┘   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Component Structure

### DocumentTranslator Component Props
```typescript
interface DocumentTranslatorProps {
  s3Key: string;              // S3 object key for the uploaded document
  fileName: string;           // Original filename for display
  messageId?: string;         // Optional message ID for status tracking
  contactId: string;          // Contact ID for context
  initialLanguage?: string;   // Default target language
}
```

### Integration Points

1. **Message Type Extension**: Added `s3Key` and `contactId` fields to message objects
2. **File Upload Enhancement**: Enhanced existing file upload to include S3 storage
3. **Chat Message Display**: Added translation UI below document messages
4. **Server Actions**: Created translation workflow management
5. **Real-time Updates**: Uses existing toast notification system

## User Experience Flow

### Step-by-Step Process:

1. **Document Upload**
   - Teacher uses existing file attachment button
   - File uploads to S3 automatically
   - Message appears with document preview

2. **Translation Request**
   - Parent sees "Translate Document" section
   - Selects target language from dropdown
   - Chooses output format (Markdown/Plain Text)
   - Clicks "Translate" button

3. **Processing**
   - UI shows "Translating..." with spinner
   - Background polling checks for completion
   - Translation service processes document asynchronously

4. **Completion**
   - Auto-download triggers when ready
   - UI updates to show "Download Translation" button
   - Success notification appears

5. **Error Handling**
   - Timeout after 2 minutes with retry option
   - Upload failures show error messages
   - Network issues gracefully handled

## Language Support

The feature supports all languages from the existing SEA Bridge configuration:

- **English** (source language)
- **Vietnamese** (Tiếng Việt)
- **Malay** (Bahasa Melayu)
- **Tamil** (தமிழ்)
- **Thai** (ไทย)
- **Tagalog**
- **Burmese** (မြန်မာဘာသာ)
- **Khmer** (ខ្មែរ)
- **Lao** (ລາວ)
- **Indonesian** (Bahasa Indonesia)
- **Mandarin Chinese** (中文)

## File Format Support

### Input Formats:
- PDF documents
- Microsoft Word (DOCX)
- Plain text (TXT)
- Markdown (MD)
- HTML documents
- Rich Text Format (RTF)

### Output Formats:
- **Markdown**: Preserves formatting, headers, lists, emphasis
- **Plain Text**: Clean text output without special formatting

## Security Features

### File Handling:
- Presigned S3 URLs for secure access
- File type validation
- Size limits (50MB default)
- Temporary URL expiration

### Authentication:
- Supabase auth for server actions
- Bearer token for translation service
- Contact-based access control

### Privacy:
- Documents processed in secure AWS environment
- No permanent storage of translations
- Automatic cleanup of temporary files

## Error States

### Common Error Scenarios:
1. **Upload Failed**: Network issues, file too large, invalid format
2. **Translation Timeout**: Service unavailable, document too complex
3. **Download Failed**: Expired URLs, network connectivity
4. **Invalid Language**: Unsupported target language

### Error Recovery:
- Retry buttons for failed operations
- Fallback to local file display if S3 fails
- Graceful degradation when translation unavailable
- Clear error messages with suggested actions

## Performance Considerations

### Optimization Features:
- Async processing prevents UI blocking
- Chunked translation for large documents
- Caching of translation results
- Progressive loading indicators

### Resource Management:
- Automatic cleanup of temporary files
- Connection pooling for AWS services
- Efficient polling intervals
- Memory management for large files

This implementation provides a seamless, user-friendly document translation experience that enhances communication between teachers and parents while maintaining the existing SEA Bridge design patterns and user experience.