"""API endpoints for document processing."""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import HttpUrl
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.exceptions import (
    BadRequestError,
    DocumentProcessingError,
    NotFoundError,
    StorageError,
    ValidationError,
)
from ...db.session import get_db
from ...schemas.document import (
    DocumentCreate,
    DocumentInDB,
    DocumentProcessRequest,
    DocumentProcessResponse,
    DocumentStatus,
    DocumentType,
    DocumentUpdate,
)
from ...services.document import document_service
from ...services.storage import storage_service
from ...utils.file_utils import get_file_extension, validate_file_extension

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/documents/upload-url", response_model=dict)
async def get_upload_url(
    file_name: str,
    content_type: str,
    file_size: int,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate a pre-signed URL for direct upload to S3.
    
    Args:
        file_name: Name of the file to upload
        content_type: MIME type of the file
        file_size: Size of the file in bytes
        current_user: Currently authenticated user
        
    Returns:
        dict: Contains the pre-signed URL and file information
    """
    try:
        # Validate file extension
        file_ext = get_file_extension(file_name)
        validate_file_extension(file_ext)
        
        # Generate a unique file key
        file_key = f"uploads/{current_user['id']}/{str(uuid.uuid4())}{file_ext}"
        
        # Generate pre-signed URL
        presigned_url = storage_service.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.S3_BUCKET_NAME,
                "Key": file_key,
                "ContentType": content_type,
                "ContentLength": file_size,
            },
            ExpiresIn=3600,  # 1 hour expiration
            HttpMethod="PUT",
        )
        
        return {
            "upload_url": presigned_url,
            "file_key": file_key,
            "file_name": file_name,
            "content_type": content_type,
            "file_size": file_size,
        }
        
    except ValidationError as e:
        raise BadRequestError(
            message="Invalid file type",
            error_code="invalid_file_type",
            detail=f"File type not allowed: {file_ext}",
        )
    except Exception as e:
        logger.error(f"Error generating upload URL: {str(e)}")
        raise StorageError(
            message="Failed to generate upload URL",
            error_code="upload_url_generation_failed",
        )

@router.post("/documents/process", response_model=DocumentProcessResponse)
async def process_document(
    request: DocumentProcessRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Process a document for translation.
    
    Args:
        request: Document processing request
        current_user: Currently authenticated user
        db: Database session
        
    Returns:
        DocumentProcessResponse: Processing job information
    """
    try:
        # Create a new document record
        document_in = DocumentCreate(
            user_id=current_user["id"],
            file_key=request.file_key,
            file_name=request.file_name,
            file_size=request.file_size,
            content_type=request.content_type,
            source_language=request.source_language,
            target_language=request.target_language,
            status=DocumentStatus.QUEUED,
        )
        
        # Save document to database
        document = document_service.create_document(db, document_in)
        
        # TODO: Send message to SQS queue for async processing
        
        return DocumentProcessResponse(
            job_id=str(document.id),
            status=document.status,
            message="Document processing has been queued",
        )
        
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        raise DocumentProcessingError(
            message="Failed to process document",
            error_code="document_processing_failed",
        )

@router.get("/documents/{document_id}/status", response_model=DocumentInDB)
async def get_document_status(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the status of a document processing job.
    
    Args:
        document_id: ID of the document
        current_user: Currently authenticated user
        db: Database session
        
    Returns:
        DocumentInDB: Document information with current status
    """
    document = document_service.get_document(db, document_id)
    
    if not document:
        raise NotFoundError(
            resource="Document",
            identifier=document_id,
            error_code="document_not_found",
        )
    
    # Check if the user has permission to access this document
    if str(document.user_id) != current_user["id"] and not current_user["is_superuser"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    return document

@router.get("/documents/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Download a processed document.
    
    Args:
        document_id: ID of the document
        current_user: Currently authenticated user
        db: Database session
        
    Returns:
        StreamingResponse: The file download
    """
    document = document_service.get_document(db, document_id)
    
    if not document:
        raise NotFoundError(
            resource="Document",
            identifier=document_id,
            error_code="document_not_found",
        )
    
    # Check if the user has permission to access this document
    if str(document.user_id) != current_user["id"] and not current_user["is_superuser"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    
    # Check if the document is ready for download
    if document.status != DocumentStatus.COMPLETED or not document.processed_file_key:
        raise BadRequestError(
            message="Document is not ready for download",
            error_code="document_not_ready",
        )
    
    try:
        # Generate a pre-signed URL for downloading the file
        download_url = storage_service.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": settings.S3_BUCKET_NAME,
                "Key": document.processed_file_key,
                "ResponseContentDisposition": f"attachment; filename={document.processed_file_name}",
            },
            ExpiresIn=3600,  # 1 hour expiration
        )
        
        return {"download_url": download_url}
        
    except Exception as e:
        logger.error(f"Error generating download URL: {str(e)}")
        raise StorageError(
            message="Failed to generate download URL",
            error_code="download_url_generation_failed",
        )

@router.get("/documents", response_model=List[DocumentInDB])
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    status: Optional[DocumentStatus] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all documents for the current user.
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        status: Filter by document status
        current_user: Currently authenticated user
        db: Database session
        
    Returns:
        List[DocumentInDB]: List of documents
    """
    # Regular users can only see their own documents
    if current_user["is_superuser"]:
        documents = document_service.get_documents(
            db, skip=skip, limit=limit, status=status
        )
    else:
        documents = document_service.get_user_documents(
            db, 
            user_id=current_user["id"], 
            skip=skip, 
            limit=limit, 
            status=status
        )
    
    return documents
