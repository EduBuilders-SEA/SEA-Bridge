"""Base schemas for the API."""
from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar, Union

from pydantic import BaseModel as PydanticBaseModel
from pydantic.generics import GenericModel

# Create a generic type variable for pagination
T = TypeVar('T')

class BaseModel(PydanticBaseModel):
    """Base model for all schemas."""
    
    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
        extra = "forbid"  # Forbid extra fields by default

class BaseResponse(BaseModel):
    """Base response model for all API responses."""
    success: bool = True
    message: Optional[str] = None

class PaginatedResponse(GenericModel, Generic[T]):
    """Generic paginated response model."""
    items: List[T]
    total: int
    page: int
    size: int
    pages: int
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

class ErrorResponse(BaseResponse):
    """Error response model."""
    success: bool = False
    error_code: str
    detail: Optional[Union[str, Dict[str, Any]]] = None
    
    @classmethod
    def from_exception(cls, exc: Exception) -> 'ErrorResponse':
        """Create an error response from an exception."""
        return cls(
            success=False,
            message=str(exc),
            error_code=getattr(exc, "error_code", "internal_server_error"),
            detail=getattr(exc, "detail", None),
        )

class ValidationErrorResponse(ErrorResponse):
    """Validation error response model."""
    error_code: str = "validation_error"
    detail: Dict[str, Any] = {}
    
    @classmethod
    def from_validation_error(
        cls, 
        errors: List[Dict[str, Any]]
    ) -> 'ValidationErrorResponse':
        """Create a validation error response from a list of errors."""
        detail = {}
        for error in errors:
            loc = ".".join(str(loc) for loc in error["loc"] if loc != "body")
            if loc not in detail:
                detail[loc] = []
            detail[loc].append(error["msg"])
        
        return cls(
            success=False,
            message="Validation error",
            error_code="validation_error",
            detail=detail,
        )

class SuccessResponse(BaseResponse):
    """Success response model."""
    data: Optional[Dict[str, Any]] = None
    
    @classmethod
    def with_data(
        cls, 
        data: Any, 
        message: Optional[str] = None
    ) -> 'SuccessResponse':
        """Create a success response with data."""
        return cls(
            success=True,
            message=message or "Operation completed successfully",
            data={"result": data},
        )

class EmptyResponse(SuccessResponse):
    """Empty success response model."""
    data: Dict[str, Any] = {}
    
    @classmethod
    def with_message(
        cls, 
        message: str = "Operation completed successfully"
    ) -> 'EmptyResponse':
        """Create an empty success response with a message."""
        return cls(
            success=True,
            message=message,
            data={},
        )
