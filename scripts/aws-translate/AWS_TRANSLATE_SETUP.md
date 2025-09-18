# AWS Translate Hybrid Setup Guide

This document outlines the hybrid approach implementation for AWS document translation in SEA-Bridge.

## Architecture Overview

### Hybrid Storage Approach
- **Regular Files**: Stored in Supabase Storage with RLS policies for security
- **AWS Translation**: Files temporarily uploaded to S3 for AWS Translate processing
- **Caching**: Translated results cached in Supabase message variants

### Why This Approach?
1. **AWS Translate Requirements**: Batch API requires files in S3 with specific folder structure
2. **Existing System**: Keep using Supabase Storage for regular file management
3. **Security**: Maintain RLS policies and secure file access
4. **Performance**: Cache completed translations to avoid re-processing

## Required AWS Resources

### 1. S3 Buckets
Create two S3 buckets:
```bash
# Input bucket for source files
aws s3 mb s3://sea-bridge-translate-input --region us-east-1

# Output bucket for translated files  
aws s3 mb s3://sea-bridge-translate-output --region us-east-1
```

### 2. IAM Role for AWS Translate
Create an IAM role with these policies:

**Trust Policy** (`translate-trust-policy.json`):
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

**Permission Policy** (`translate-permissions-policy.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sea-bridge-translate-input",
        "arn:aws:s3:::sea-bridge-translate-input/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sea-bridge-translate-output",
        "arn:aws:s3:::sea-bridge-translate-output/*"
      ]
    }
  ]
}
```

Create the role:
```bash
aws iam create-role \
  --role-name sea-bridge-translate-role \
  --assume-role-policy-document file://translate-trust-policy.json

aws iam put-role-policy \
  --role-name sea-bridge-translate-role \
  --policy-name TranslateS3Access \
  --policy-document file://translate-permissions-policy.json
```

### 3. IAM User for Application
Create an IAM user with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "translate:StartTextTranslationJob",
        "translate:DescribeTextTranslationJob",
        "translate:ListTextTranslationJobs"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:HeadObject"
      ],
      "Resource": [
        "arn:aws:s3:::sea-bridge-translate-input",
        "arn:aws:s3:::sea-bridge-translate-input/*",
        "arn:aws:s3:::sea-bridge-translate-output",
        "arn:aws:s3:::sea-bridge-translate-output/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::YOUR_ACCOUNT_ID:role/sea-bridge-translate-role"
    }
  ]
}
```

## Environment Variables

Add these to your `.env.local` file:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_TRANSLATE_REGION=us-east-1
AWS_S3_REGION=us-east-1
AWS_ACCOUNT_ID=your_aws_account_id

# AWS Translate Buckets
AWS_TRANSLATE_INPUT_BUCKET=sea-bridge-translate-input
AWS_TRANSLATE_OUTPUT_BUCKET=sea-bridge-translate-output

# AWS Translate IAM Role
AWS_TRANSLATE_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/sea-bridge-translate-role
```

## How It Works

### File Upload Flow
1. **User uploads file** → Stored in Supabase Storage with RLS
2. **Translation request** → File downloaded from Supabase
3. **AWS processing** → File uploaded to S3 input bucket in folder structure
4. **Batch job** → AWS Translate processes file maintaining format
5. **Result caching** → Download URL cached in Supabase message variants

### Folder Structure in S3
AWS Translate requires specific folder structures:

**Input:**
```
s3://sea-bridge-translate-input/
  job-timestamp-randomid/
    input/
      sanitized-filename.docx
```

**Output:**
```
s3://sea-bridge-translate-output/
  job-timestamp-randomid/
    output/
      account-id-TranslateText-job-id/
        target-language/
          sanitized-filename.docx
```

### Supported File Types
- **Document formats**: DOCX, PPTX, XLSX (format preserved)
- **Text formats**: TXT, HTML, Markdown (converted to text/plain)
- **Unsupported**: PDF, RTF (converted to text/plain, formatting may be lost)

## Testing

### 1. Test S3 Upload
```typescript
// In your development environment
import { uploadToS3ForTranslation } from '@/lib/aws/s3-utils';

const testBuffer = Buffer.from('Hello World');
const uri = await uploadToS3ForTranslation(testBuffer, 'test.txt', 'text/plain');
console.log('Uploaded to:', uri);
```

### 2. Test Translation Job
```typescript
// Test starting a translation job
import { documentTranslator } from '@/lib/aws/translate-service';

const jobId = await documentTranslator.startTranslationJob(
  Buffer.from('Hello World'),
  'test.txt',
  'text/plain',
  'Spanish'
);
console.log('Job started:', jobId);
```

## Monitoring and Troubleshooting

### Common Issues

1. **NO_FILE_FOUND Error**
   - Ensure files are uploaded to folder structure (`job-id/input/filename`)
   - Check S3 bucket permissions
   - Verify IAM role has correct S3 access

2. **Translation Job Failed**
   - Check AWS CloudWatch logs
   - Verify IAM role permissions
   - Ensure file format is supported by AWS Translate

3. **Access Denied**
   - Verify IAM user has PassRole permission
   - Check S3 bucket policies
   - Ensure role trust policy allows AWS Translate service

### AWS CLI Debugging

List files in input bucket:
```bash
aws s3 ls s3://sea-bridge-translate-input/ --recursive
```

Check translation job status:
```bash
aws translate describe-text-translation-job --job-id YOUR_JOB_ID
```

### CloudWatch Logs
Monitor AWS Translate logs in CloudWatch under:
- Service: Amazon Translate
- Log Group: `/aws/translate/text-translation-job`

## Security Considerations

1. **S3 Bucket Policies**: Restrict access to your AWS account only
2. **IAM Least Privilege**: Grant minimum necessary permissions
3. **File Cleanup**: Consider implementing cleanup policies for temporary files
4. **Data Encryption**: Enable S3 encryption at rest and in transit
5. **Access Logging**: Enable S3 access logging for audit trails

## Performance Optimization

1. **Batch Processing**: Process multiple files in single jobs when possible
2. **Caching Strategy**: Cache translations in Supabase for repeated requests
3. **File Size Limits**: AWS Translate has size limits (5MB per file, 1GB per job)
4. **Concurrent Jobs**: Limit concurrent translation jobs to avoid throttling

## Cost Management

- **Input/Output Storage**: S3 storage costs for temporary files
- **Translation Costs**: AWS Translate charges per character translated
- **Data Transfer**: S3 to AWS Translate data transfer (usually free in same region)
- **API Calls**: S3 API calls for upload/download operations

Monitor costs in AWS Cost Explorer and set up billing alerts.