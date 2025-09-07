"""Document schemas for the API."""
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl, validator

from ..core.validators import validate_language_code

class DocumentStatus(str, Enum):
    """Status of a document processing job."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class DocumentType(str, Enum):
    """Type of document."""
    PDF = "pdf"
    DOCX = "docx"
    DOC = "doc"
    TXT = "txt"
    IMAGE = "image"

class DocumentBase(BaseModel):
    """Base document schema with common fields."""
    file_name: str = Field(..., description="Original file name")
    file_size: int = Field(..., description="File size in bytes")
    content_type: str = Field(..., description="MIME type of the file")
    source_language: Optional[str] = Field(
        None, 
        description="Source language code (ISO 639-1), None for auto-detect"
    )
    target_language: str = Field(..., description="Target language code (ISO 639-1)")
    
    @validator('source_language')
    def validate_source_language(cls, v):
        """Validate source language code."""
        if v is None:
            return None
        return validate_language_code(v)
    
    @validator('target_language')
    def validate_target_language(cls, v):
        """Validate target language code."""
        return validate_language_code(v)

class DocumentCreate(DocumentBase):
    """Schema for creating a new document."""
    file_key: str = Field(..., description="S3 object key for the file")
    user_id: int = Field(..., description="ID of the user who owns the document")

class DocumentUpdate(BaseModel):
    """Schema for updating a document."""
    status: Optional[DocumentStatus] = None
    error_message: Optional[str] = None
    processed_file_key: Optional[str] = None
    processed_file_name: Optional[str] = None
    processed_file_size: Optional[int] = None
    processed_at: Optional[datetime] = None

class DocumentInDB(DocumentBase):
    """Document model for database operations."""
    id: int
    file_key: str
    status: DocumentStatus
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    processed_file_key: Optional[str] = None
    processed_file_name: Optional[str] = None
    processed_file_size: Optional[int] = None
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    class Config:
        orm_mode = True

class DocumentResponse(DocumentBase):
    """Document model for API responses."""
    id: int
    status: DocumentStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    download_url: Optional[HttpUrl] = None
    error_message: Optional[str] = None
    
    @classmethod
    def from_orm(cls, document):
        """Convert ORM model to response model."""
        return cls(
            id=document.id,
            file_name=document.file_name,
            file_size=document.file_size,
            content_type=document.content_type,
            source_language=document.source_language,
            target_language=document.target_language,
            status=document.status,
            created_at=document.created_at,
            updated_at=document.updated_at,
            processed_at=document.processed_at,
            error_message=document.error_message,
        )

class DocumentProcessRequest(BaseModel):
    """Schema for document processing request."""
    file_key: str = Field(..., description="S3 object key of the uploaded file")
    file_name: str = Field(..., description="Original file name")
    file_size: int = Field(..., description="File size in bytes")
    content_type: str = Field(..., description="MIME type of the file")
    source_language: Optional[str] = Field(
        None,
        description="Source language code (ISO 639-1), None for auto-detect"
    )
    target_language: str = Field(..., description="Target language code (ISO 639-1)")

class DocumentProcessResponse(BaseModel):
    """Schema for document processing response."""
    job_id: str = Field(..., description="Unique ID for tracking the processing job")
    status: str = Field(..., description="Current status of the processing job")
    message: str = Field(..., description="Human-readable status message")

class DocumentListResponse(BaseModel):
    """Response model for listing documents with pagination."""
    items: List[DocumentResponse]
    total: int
    page: int
    size: int
    pages: int

class DocumentUploadResponse(BaseModel):
    """Response model for document upload."""
    upload_url: str = Field(..., description="Pre-signed URL for uploading the file")
    file_key: str = Field(..., description="S3 object key for the uploaded file")
    expires_in: int = Field(..., description="URL expiration time in seconds")

class DocumentDownloadResponse(BaseModel):
    """Response model for document download."""
    download_url: str = Field(..., description="Pre-signed URL for downloading the file")
    expires_in: int = Field(..., description="URL expiration time in seconds")
