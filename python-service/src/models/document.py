"""Document model and related functionality."""
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl, validator
from sqlalchemy import (
    Column,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from ..db.base_class import Base

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
    """Base document model with common fields."""
    file_name: str = Field(..., description="Original file name")
    file_size: int = Field(..., description="File size in bytes")
    content_type: str = Field(..., description="MIME type of the file")
    source_language: Optional[str] = Field(
        None, 
        description="Source language code (ISO 639-1), None for auto-detect"
    )
    target_language: str = Field(..., description="Target language code (ISO 639-1)")
    
    class Config:
        orm_mode = True
        use_enum_values = True

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

class DocumentResponse(DocumentBase):
    """Document model for API responses."""
    id: int
    status: DocumentStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    download_url: Optional[HttpUrl] = None
    error_message: Optional[str] = None

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

class Document(Base):
    """Database model for documents."""
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    file_key = Column(String, nullable=False, index=True)
    file_name = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String, nullable=False)
    status = Column(
        SQLEnum(DocumentStatus), 
        default=DocumentStatus.QUEUED, 
        nullable=False,
        index=True
    )
    source_language = Column(String(10), nullable=True)
    target_language = Column(String(10), nullable=False)
    processed_file_key = Column(String, nullable=True)
    processed_file_name = Column(String, nullable=True)
    processed_file_size = Column(Integer, nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="documents")
    
    def __repr__(self) -> str:
        return f"<Document(id={self.id}, file_name='{self.file_name}', status='{self.status}')>"
