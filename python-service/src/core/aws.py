"""
Manages AWS service clients using aioboto3.
"""
from typing import Optional, Any
from contextlib import asynccontextmanager
import aioboto3
from botocore.client import Config
from src.config import settings
from src.core.logging import logger

class AWSClientManager:
    _session: Optional[aioboto3.Session] = None

    @classmethod
    def get_session(cls) -> aioboto3.Session:
        """Get the aioboto3 session, creating it if it doesn't exist."""
        if cls._session is None:
            logger.info("Creating new aioboto3 session...")
            cls._session = aioboto3.Session(
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
        return cls._session

    @asynccontextmanager
    async def get_client(self, service_name: str, endpoint_url: Optional[str] = None):
        """Get an AWS service client."""
        session = self.get_session()
        client_config = Config(
            retries={
                'max_attempts': 3,
                'mode': 'standard'
            }
        )
        async with session.client(service_name, endpoint_url=endpoint_url, config=client_config) as client:
            yield client

# Global instance
aws_client_manager = AWSClientManager()

# Helper functions for specific services
@asynccontextmanager
async def get_s3_client():
    """Get an S3 client."""
    async with aws_client_manager.get_client("s3", endpoint_url=settings.S3_ENDPOINT_URL) as client:
        yield client

@asynccontextmanager
async def get_sqs_client():
    """Get an SQS client."""
    async with aws_client_manager.get_client("sqs", endpoint_url=settings.SQS_ENDPOINT_URL) as client:
        yield client

@asynccontextmanager
async def get_dynamodb_client():
    """Get a DynamoDB client."""
    async with aws_client_manager.get_client("dynamodb", endpoint_url=settings.DYNAMODB_ENDPOINT_URL) as client:
        yield client

@asynccontextmanager
async def get_translate_client():
    """Get a Translate client."""
    async with aws_client_manager.get_client("translate") as client:
        yield client
