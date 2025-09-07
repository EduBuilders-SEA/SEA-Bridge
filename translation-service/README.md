# SEA-Bridge Document Translation Service

FastAPI microservice for translating documents using AWS Bedrock (SEA-LION).

## Quick Start

1.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

2.  Configure environment:
    ```bash
    cp .env.example .env
    # Edit .env with your AWS credentials
    ```

3.  Run locally:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```

## Deployment to AWS Lambda

```bash
# Build Docker image
docker build -t translation-service .

# Push to ECR
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin [your-ecr-url]
docker tag translation-service:latest [your-ecr-url]/translation-service:latest
docker push [your-ecr-url]/translation-service:latest
```

## API Usage

POST /v1/translate-file
- `file_url`: S3 presigned GET URL
- `output_url`: S3 presigned PUT URL  
- `target_lang`: Target language (e.g., "Vietnamese", "Malay")
- `preserve_format`: "markdown" or "text"
- `return_mode`: "async" (default)