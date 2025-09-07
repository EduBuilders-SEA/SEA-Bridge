"""Service for handling file storage operations with S3."""
import logging
import os
from typing import Optional, Tuple, Union, BinaryIO

import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile, HTTPException, status

from ..core.config import settings
from ..core.exceptions import StorageError

logger = logging.getLogger(__name__)

class StorageService:
    """Service for handling file storage operations with S3."""
    
    def __init__(self):
        """Initialize the storage service with S3 client."""
        self.s3_client = boto3.client(
            's3',
            region_name=settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            endpoint_url=settings.S3_ENDPOINT_URL,
        )
        self.bucket_name = settings.S3_BUCKET_NAME
    
    def upload_file(
        self,
        file_content: Union[bytes, BinaryIO],
        file_key: str,
        content_type: str = 'application/octet-stream',
        metadata: Optional[dict] = None,
    ) -> str:
        """
        Upload a file to S3.
        
        Args:
            file_content: File content as bytes or file-like object
            file_key: S3 object key (path)
            content_type: MIME type of the file
            metadata: Optional metadata to store with the file
            
        Returns:
            str: S3 object URL
            
        Raises:
            StorageError: If the upload fails
        """
        try:
            extra_args = {'ContentType': content_type}
            if metadata:
                extra_args['Metadata'] = metadata
            
            self.s3_client.upload_fileobj(
                file_content,
                self.bucket_name,
                file_key,
                ExtraArgs=extra_args,
            )
            
            # Generate the public URL
            url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{file_key}"
            return url
            
        except ClientError as e:
            logger.error(f"Error uploading file to S3: {str(e)}")
            raise StorageError(
                message="Failed to upload file to storage",
                error_code="file_upload_failed",
            )
    
    def download_file(
        self,
        file_key: str,
        local_path: Optional[str] = None,
    ) -> bytes:
        """
        Download a file from S3.
        
        Args:
            file_key: S3 object key (path)
            local_path: Optional local path to save the file
            
        Returns:
            bytes: File content
            
        Raises:
            StorageError: If the download fails
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=file_key,
            )
            
            file_content = response['Body'].read()
            
            if local_path:
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                with open(local_path, 'wb') as f:
                    f.write(file_content)
            
            return file_content
            
        except ClientError as e:
            logger.error(f"Error downloading file from S3: {str(e)}")
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise StorageError(
                    message="File not found in storage",
                    error_code="file_not_found",
                )
            raise StorageError(
                message="Failed to download file from storage",
                error_code="file_download_failed",
            )
    
    def delete_file(self, file_key: str) -> bool:
        """
        Delete a file from S3.
        
        Args:
            file_key: S3 object key (path)
            
        Returns:
            bool: True if deletion was successful
            
        Raises:
            StorageError: If the deletion fails
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=file_key,
            )
            return True
            
        except ClientError as e:
            logger.error(f"Error deleting file from S3: {str(e)}")
            raise StorageError(
                message="Failed to delete file from storage",
                error_code="file_deletion_failed",
            )
    
    def generate_presigned_url(
        self,
        method: str,
        file_key: str,
        expires_in: int = 3600,
        content_type: Optional[str] = None,
        content_length: Optional[int] = None,
    ) -> str:
        """
        Generate a pre-signed URL for S3 operations.
        
        Args:
            method: HTTP method (get_object, put_object, etc.)
            file_key: S3 object key (path)
            expires_in: Expiration time in seconds (default: 1 hour)
            content_type: Optional content type for uploads
            content_length: Optional content length for uploads
            
        Returns:
            str: Pre-signed URL
            
        Raises:
            StorageError: If URL generation fails
        """
        try:
            params = {
                'Bucket': self.bucket_name,
                'Key': file_key,
            }
            
            # Add content type and length for uploads
            if method.lower() == 'put':
                extra_args = {}
                if content_type:
                    extra_args['ContentType'] = content_type
                if content_length is not None:
                    extra_args['ContentLength'] = content_length
                
                if extra_args:
                    params['Fields'] = extra_args
            
            url = self.s3_client.generate_presigned_url(
                ClientMethod=f'{method.lower()}_object',
                Params=params,
                ExpiresIn=expires_in,
                HttpMethod=method.upper(),
            )
            
            return url
            
        except ClientError as e:
            logger.error(f"Error generating pre-signed URL: {str(e)}")
            raise StorageError(
                message="Failed to generate pre-signed URL",
                error_code="url_generation_failed",
            )
    
    def get_file_metadata(self, file_key: str) -> dict:
        """
        Get metadata for a file in S3.
        
        Args:
            file_key: S3 object key (path)
            
        Returns:
            dict: File metadata
            
        Raises:
            StorageError: If metadata retrieval fails
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=file_key,
            )
            
            return {
                'content_type': response.get('ContentType'),
                'content_length': response.get('ContentLength'),
                'last_modified': response.get('LastModified'),
                'metadata': response.get('Metadata', {}),
                'etag': response.get('ETag', '').strip('"\''),
            }
            
        except ClientError as e:
            logger.error(f"Error getting file metadata: {str(e)}")
            if e.response['Error']['Code'] == '404':
                raise StorageError(
                    message="File not found in storage",
                    error_code="file_not_found",
                )
            raise StorageError(
                message="Failed to get file metadata",
                error_code="metadata_retrieval_failed",
            )
    
    def copy_file(
        self,
        source_key: str,
        destination_key: str,
        metadata: Optional[dict] = None,
    ) -> str:
        """
        Copy a file within S3.
        
        Args:
            source_key: Source S3 object key
            destination_key: Destination S3 object key
            metadata: Optional metadata to update
            
        Returns:
            str: URL of the copied file
            
        Raises:
            StorageError: If the copy operation fails
        """
        try:
            copy_source = {
                'Bucket': self.bucket_name,
                'Key': source_key,
            }
            
            extra_args = {}
            if metadata:
                extra_args['Metadata'] = metadata
                extra_args['MetadataDirective'] = 'REPLACE'
            
            self.s3_client.copy_object(
                Bucket=self.bucket_name,
                Key=destination_key,
                CopySource=copy_source,
                **extra_args,
            )
            
            return f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{destination_key}"
            
        except ClientError as e:
            logger.error(f"Error copying file in S3: {str(e)}")
            raise StorageError(
                message="Failed to copy file in storage",
                error_code="file_copy_failed",
            )

# Create a singleton instance of the storage service
storage_service = StorageService()
