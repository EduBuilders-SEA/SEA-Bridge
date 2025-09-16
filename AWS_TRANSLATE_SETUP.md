# AWS Document Translation Setup

This document provides setup instructions for AWS Translate document translation feature in SEA-Bridge.

## Prerequisites

1. AWS Account with appropriate permissions
2. AWS CLI configured (optional but recommended)
3. S3 buckets for translation input/output
4. IAM role for AWS Translate service

## AWS Setup Steps

### 1. Create S3 Buckets

```bash
# Create S3 buckets for translation
aws s3 mb s3://sea-bridge-translate-input
aws s3 mb s3://sea-bridge-translate-output

# Set bucket policies for translation service access
aws s3api put-bucket-policy --bucket sea-bridge-translate-input --policy file://translate-input-policy.json
aws s3api put-bucket-policy --bucket sea-bridge-translate-output --policy file://translate-output-policy.json
```

### 2. Create IAM Role for AWS Translate

Create a trust policy file `translate-trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "translate.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the IAM role:

```bash
# Create IAM role for Translate service
aws iam create-role --role-name translate-service-role \
  --assume-role-policy-document file://translate-trust-policy.json

# Attach S3 access policy
aws iam attach-role-policy --role-name translate-service-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

# Attach Translate access policy  
aws iam attach-role-policy --role-name translate-service-role \
  --policy-arn arn:aws:iam::aws:policy/TranslateReadOnly
```

### 3. Environment Variables

Add these to your `.env.local` file:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_ACCOUNT_ID=123456789012
AWS_TRANSLATE_REGION=us-east-1
AWS_S3_REGION=us-east-1

# S3 Buckets
AWS_TRANSLATE_INPUT_BUCKET=sea-bridge-translate-input
AWS_TRANSLATE_OUTPUT_BUCKET=sea-bridge-translate-output

# IAM Role ARN
AWS_TRANSLATE_ROLE_ARN=arn:aws:iam::123456789012:role/translate-service-role
```

## Supported Document Formats

AWS Translate supports these document formats for batch translation:

- **Microsoft Word**: .docx (preserves formatting)
- **Microsoft PowerPoint**: .pptx (preserves formatting)
- **Microsoft Excel**: .xlsx (preserves formatting)
- **HTML**: .html, .htm
- **Plain Text**: .txt
- **PDF**: .pdf (limited regional support)

## Key Features

1. **Format Preservation**: Documents are translated while maintaining their original format
2. **Batch Processing**: Large documents are handled asynchronously
3. **Real-time Progress**: Users see live updates on translation progress
4. **Intelligent Caching**: Completed translations are cached for instant access
5. **Error Handling**: Comprehensive error handling with user-friendly messages

## Cost Optimization

- Translations are cached to avoid duplicate costs
- Only supported file formats are processed
- Files are automatically cleaned up after processing
- Batch processing reduces API calls

## Security

- All files are uploaded to secure S3 buckets
- IAM roles provide least-privilege access
- Temporary signed URLs are used for downloads
- No data is permanently stored beyond caching period

## Troubleshooting

### Common Issues

1. **"Invalid credentials"**: Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
2. **"Access denied"**: Verify IAM role permissions and S3 bucket policies
3. **"Job not found"**: Ensure AWS_TRANSLATE_ROLE_ARN is correct
4. **"Unsupported format"**: Check file extension against supported formats

### Debug Mode

Set environment variable for detailed logging:
```env
DEBUG_AWS_TRANSLATE=true
```

## Testing

Test the translation service with a sample document:

1. Upload a .docx file through the chat interface
2. Select a target language from the language selector
3. Click "Download in [Language]" 
4. Monitor the progress indicator
5. Document should auto-download when complete

## Regional Considerations

- AWS Translate availability varies by region
- Some document formats have regional limitations
- Choose regions based on your user base location
- Consider data residency requirements for educational content