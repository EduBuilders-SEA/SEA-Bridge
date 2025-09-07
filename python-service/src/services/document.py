"""Service layer for document operations."""
import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.exceptions import (
    BadRequestError,
    DocumentProcessingError,
    NotFoundError,
    StorageError,
)
from ..models.document import (
    Document,
    DocumentCreate,
    DocumentInDB,
    DocumentStatus,
    DocumentUpdate,
)
from ..schemas.document import DocumentResponse
from ..services.storage import storage_service

logger = logging.getLogger(__name__)

class DocumentService:
    """Service for document operations."""
    
    def create_document(
        self, db: Session, document_in: DocumentCreate
    ) -> DocumentInDB:
        """Create a new document record."""
        try:
            db_document = Document(**document_in.dict())
            db.add(db_document)
            db.commit()
            db.refresh(db_document)
            return DocumentInDB.from_orm(db_document)
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating document: {str(e)}")
            raise DocumentProcessingError(
                message="Failed to create document record",
                error_code="document_creation_failed",
            )
    
    def get_document(self, db: Session, document_id: int) -> Optional[DocumentInDB]:
        """Get a document by ID."""
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if document:
                return DocumentInDB.from_orm(document)
            return None
        except Exception as e:
            logger.error(f"Error retrieving document {document_id}: {str(e)}")
            raise DocumentProcessingError(
                message="Failed to retrieve document",
                error_code="document_retrieval_failed",
            )
    
    def get_user_documents(
        self,
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
        status: Optional[DocumentStatus] = None,
    ) -> List[DocumentInDB]:
        """Get all documents for a user."""
        try:
            query = db.query(Document).filter(Document.user_id == user_id)
            
            if status:
                query = query.filter(Document.status == status)
            
            documents = query.offset(skip).limit(limit).all()
            return [DocumentInDB.from_orm(doc) for doc in documents]
        except Exception as e:
            logger.error(f"Error retrieving user {user_id} documents: {str(e)}")
            raise DocumentProcessingError(
                message="Failed to retrieve user documents",
                error_code="user_documents_retrieval_failed",
            )
    
    def update_document(
        self,
        db: Session,
        document_id: int,
        document_in: DocumentUpdate,
    ) -> DocumentInDB:
        """Update a document."""
        try:
            db_document = db.query(Document).filter(Document.id == document_id).first()
            if not db_document:
                raise NotFoundError(
                    resource="Document",
                    identifier=document_id,
                    error_code="document_not_found",
                )
            
            update_data = document_in.dict(exclude_unset=True)
            
            # Handle status updates
            if "status" in update_data:
                db_document.status = update_data["status"]
                
                # Set processed_at timestamp when status changes to COMPLETED or FAILED
                if update_data["status"] in [DocumentStatus.COMPLETED, DocumentStatus.FAILED]:
                    db_document.processed_at = datetime.utcnow()
            
            # Update other fields
            for field, value in update_data.items():
                if field != "status":  # status is already handled above
                    setattr(db_document, field, value)
            
            db.add(db_document)
            db.commit()
            db.refresh(db_document)
            
            return DocumentInDB.from_orm(db_document)
            
        except NotFoundError:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating document {document_id}: {str(e)}")
            raise DocumentProcessingError(
                message="Failed to update document",
                error_code="document_update_failed",
            )
    
    def delete_document(self, db: Session, document_id: int) -> bool:
        """Delete a document."""
        try:
            db_document = db.query(Document).filter(Document.id == document_id).first()
            if not db_document:
                raise NotFoundError(
                    resource="Document",
                    identifier=document_id,
                    error_code="document_not_found",
                )
            
            # Delete the file from storage
            if db_document.file_key:
                try:
                    storage_service.delete_file(db_document.file_key)
                except Exception as e:
                    logger.warning(f"Failed to delete file {db_document.file_key}: {str(e)}")
            
            # Delete the processed file if it exists
            if db_document.processed_file_key:
                try:
                    storage_service.delete_file(db_document.processed_file_key)
                except Exception as e:
                    logger.warning(f"Failed to delete processed file {db_document.processed_file_key}: {str(e)}")
            
            # Delete the database record
            db.delete(db_document)
            db.commit()
            return True
            
        except NotFoundError:
            raise
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting document {document_id}: {str(e)}")
            raise DocumentProcessingError(
                message="Failed to delete document",
                error_code="document_deletion_failed",
            )
    
    def process_document(
        self,
        db: Session,
        document_id: int,
        file_content: bytes,
        content_type: str,
    ) -> DocumentInDB:
        """Process a document for translation."""
        try:
            # Get the document
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                raise NotFoundError(
                    resource="Document",
                    identifier=document_id,
                    error_code="document_not_found",
                )
            
            # Update status to PROCESSING
            document = self.update_document(
                db,
                document_id,
                DocumentUpdate(status=DocumentStatus.PROCESSING),
            )
            
            try:
                # TODO: Implement actual document processing logic
                # This is a placeholder for the actual implementation
                processed_content = b"Processed content"  # Replace with actual processing
                
                # Upload the processed file
                processed_file_key = f"processed/{document_id}/translated_{document.file_name}"
                storage_service.upload_file(
                    file_content=processed_content,
                    file_key=processed_file_key,
                    content_type=content_type,
                )
                
                # Update document with processed file info
                document = self.update_document(
                    db,
                    document_id,
                    DocumentUpdate(
                        status=DocumentStatus.COMPLETED,
                        processed_file_key=processed_file_key,
                        processed_file_name=f"translated_{document.file_name}",
                        processed_file_size=len(processed_content),
                    ),
                )
                
                return document
                
            except Exception as e:
                # Update document with error
                self.update_document(
                    db,
                    document_id,
                    DocumentUpdate(
                        status=DocumentStatus.FAILED,
                        error_message=str(e),
                    ),
                )
                raise
                
        except Exception as e:
            logger.error(f"Error processing document {document_id}: {str(e)}")
            raise DocumentProcessingError(
                message="Failed to process document",
                error_code="document_processing_failed",
            )

# Create a singleton instance of the service
document_service = DocumentService()
