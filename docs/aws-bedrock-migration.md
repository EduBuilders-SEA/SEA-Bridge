# AWS Bedrock Migration Guide

This project has been migrated from Google AI (Genkit) to AWS Bedrock for AI functionality. This document outlines the changes and setup requirements.

## Changes Made

### 1. AI Infrastructure
- **Replaced**: Google AI Genkit with AWS Bedrock
- **New file**: `src/ai/bedrock.ts` - Core AWS Bedrock integration
- **Updated**: `src/ai/genkit.ts` - Now exports the Bedrock AI instance
- **Added**: `src/ai/transcribe.ts` - AWS Transcribe service for audio processing

### 2. Dependencies
- **Added**: 
  - `@aws-sdk/client-bedrock-runtime`
  - `@aws-sdk/client-transcribe` 
  - `@aws-sdk/client-s3`
- **Can be removed** (if not used elsewhere):
  - `@genkit-ai/googleai`
  - `@genkit-ai/next`
  - `genkit`
  - `genkit-cli`

### 3. Environment Variables
Add these to your `.env` file:

```bash
# AWS Bedrock Configuration
AWS_BEDROCK_MODEL_ARN=arn:aws:bedrock:us-east-1:071564565652:imported-model/18wtka1nexym
AWS_REGION=us-east-1
AWS_PROFILE=ADMIN
AWS_BEDROCK_MAX_GEN_LEN=512
AWS_BEDROCK_TEMPERATURE=0.5

# AWS Transcribe Configuration (for audio features)
AWS_S3_TRANSCRIBE_BUCKET=sea-bridge-transcribe
```

### 4. AWS Setup Requirements

#### Prerequisites
1. **AWS CLI** installed and configured
2. **AWS credentials** configured (via `aws configure` or environment variables)
3. **AWS Profile** named "ADMIN" (or update the profile name in config)

#### Required AWS Services Access
1. **Amazon Bedrock** - For text generation and AI features
2. **Amazon Transcribe** - For audio transcription (if using audio features)
3. **Amazon S3** - For temporary audio file storage during transcription

#### S3 Bucket Setup
Create an S3 bucket for audio transcription:
```bash
aws s3 mb s3://sea-bridge-transcribe --region us-east-1
```

### 5. API Compatibility

The new AWS Bedrock implementation maintains the same API as the previous Genkit implementation:

- `ai.generate()` - Text generation
- `ai.definePrompt()` - Prompt definitions with templates
- `ai.defineFlow()` - Workflow definitions

### 6. Audio Transcription Changes

The `transcribe-and-translate` flow now uses AWS Transcribe instead of Google's multimodal capabilities:

- Audio files are temporarily uploaded to S3
- AWS Transcribe processes the audio
- Results are cleaned up automatically

### 7. Testing

Run the AI integration tests:
```bash
npm run ai:test
```

## Migration Benefits

1. **Cost Control** - Better pricing model with AWS Bedrock
2. **Enterprise Security** - Full control over data processing
3. **Regional Compliance** - Data stays in specified AWS regions
4. **Scalability** - Leverages AWS infrastructure
5. **Integration** - Better integration with other AWS services

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Found**
   - Run `aws configure` to set up credentials
   - Or set environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

2. **Bedrock Model Access Denied**
   - Ensure your AWS account has access to the specified Bedrock model
   - Check the model ARN is correct for your region

3. **S3 Bucket Not Found**
   - Create the S3 bucket specified in `AWS_S3_TRANSCRIBE_BUCKET`
   - Ensure proper S3 permissions

4. **Transcription Failures**
   - Check S3 bucket permissions
   - Verify AWS Transcribe service is available in your region

### Model Configuration

To use a different Bedrock model, update the `AWS_BEDROCK_MODEL_ARN` environment variable:

```bash
# Example for Claude models
AWS_BEDROCK_MODEL_ARN=anthropic.claude-3-sonnet-20240229-v1:0

# Example for Llama models  
AWS_BEDROCK_MODEL_ARN=meta.llama2-70b-chat-v1
```

## Performance Considerations

- **Cold Start**: First requests may be slower due to AWS SDK initialization
- **Rate Limits**: AWS Bedrock has different rate limits than Google AI
- **Latency**: May vary based on AWS region and model selection

## Next Steps

1. Test all AI flows with the new implementation
2. Remove unused Genkit dependencies if not needed elsewhere
3. Set up monitoring for AWS costs and usage
4. Consider implementing caching for frequently used prompts
