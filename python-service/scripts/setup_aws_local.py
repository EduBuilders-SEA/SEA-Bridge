""
Setup AWS resources for local development using LocalStack.
"""
import boto3
import logging
from botocore.config import Config
from src.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_s3_bucket(s3_client, bucket_name: str) -> None:
    try:
        s3_client.head_bucket(Bucket=bucket_name)
        logger.info(f"S3 bucket '{bucket_name}' exists")
    except:
        s3_client.create_bucket(Bucket=bucket_name)
        logger.info(f"Created S3 bucket: {bucket_name}")

def create_sqs_queue(sqs_client, queue_name: str) -> str:
    try:
        return sqs_client.get_queue_url(QueueName=queue_name)["QueueUrl"]
    except:
        response = sqs_client.create_queue(QueueName=queue_name)
        return response["QueueUrl"]

def main():
    logger.info("Setting up AWS resources...")
    
    boto_config = Config(
        region_name=settings.AWS_REGION,
        aws_access_key_id="test",
        aws_secret_access_key="test",
        endpoint_url=settings.S3_ENDPOINT_URL,
    )
    
    # Create S3 client and bucket
    s3 = boto3.client("s3", config=boto_config)
    create_s3_bucket(s3, settings.S3_BUCKET_NAME)
    
    # Create SQS client and queue
    sqs = boto3.client("sqs", 
                      endpoint_url=settings.SQS_ENDPOINT_URL,
                      config=boto_config)
    queue_url = create_sqs_queue(sqs, settings.SQS_QUEUE_NAME)
    
    logger.info(f"SQS Queue URL: {queue_url}")
    logger.info("AWS resources setup complete")

if __name__ == "__main__":
    main()
