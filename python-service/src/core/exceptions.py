"""Custom exceptions for the application."""
from typing import Any, Dict, Optional

from fastapi import status


class AppException(Exception):
    """Base exception for all application-specific exceptions."""
    
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        detail: Optional[Any] = None,
        **kwargs: Any
    ) -> None:
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.detail = detail or message
        self.extra = kwargs
        super().__init__(message)


class HTTPException(AppException):
    """Base HTTP exception that maps to an HTTP status code."""
    
    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "http_error",
        message: str = "An error occurred",
        detail: Optional[Any] = None,
        **kwargs: Any
    ) -> None:
        super().__init__(status_code, error_code, message, detail, **kwargs)


class BadRequestError(HTTPException):
    """400 Bad Request."""
    
    def __init__(
        self,
        message: str = "Bad Request",
        error_code: str = "bad_request",
        **kwargs: Any
    ) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code=error_code,
            message=message,
            **kwargs
        )


class UnauthorizedError(HTTPException):
    """401 Unauthorized."""
    
    def __init__(
        self,
        message: str = "Not authenticated",
        error_code: str = "unauthorized",
        **kwargs: Any
    ) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code=error_code,
            message=message,
            **kwargs
        )


class ForbiddenError(HTTPException):
    """403 Forbidden."""
    
    def __init__(
        self,
        message: str = "Forbidden",
        error_code: str = "forbidden",
        **kwargs: Any
    ) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code=error_code,
            message=message,
            **kwargs
        )


class NotFoundError(HTTPException):
    """404 Not Found."""
    
    def __init__(
        self,
        resource: str = "Resource",
        identifier: Optional[Any] = None,
        error_code: str = "not_found",
        **kwargs: Any
    ) -> None:
        message = f"{resource} not found"
        if identifier is not None:
            message += f" with id '{identifier}'"
        
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code=error_code,
            message=message,
            **kwargs
        )


class ConflictError(HTTPException):
    """409 Conflict."""
    
    def __init__(
        self,
        message: str = "Conflict",
        error_code: str = "conflict",
        **kwargs: Any
    ) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code=error_code,
            message=message,
            **kwargs
        )


class UnprocessableEntityError(HTTPException):
    """422 Unprocessable Entity."""
    
    def __init__(
        self,
        message: str = "Unprocessable Entity",
        error_code: str = "unprocessable_entity",
        **kwargs: Any
    ) -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error_code=error_code,
            message=message,
            **kwargs
        )


class RateLimitExceededError(HTTPException):
    """429 Too Many Requests."""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        error_code: str = "rate_limit_exceeded",
        retry_after: Optional[int] = None,
        **kwargs: Any
    ) -> None:
        headers = {}
        if retry_after is not None:
            headers["Retry-After"] = str(retry_after)
        
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code=error_code,
            message=message,
            headers=headers,
            **kwargs
        )


class InternalServerError(HTTPException):
    """500 Internal Server Error."""
    
    def __init__(
        self,
        message: str = "Internal Server Error",
        error_code: str = "internal_server_error",
        **kwargs: Any
    ) -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code=error_code,
            message=message,
            **kwargs
        )


class ServiceUnavailableError(HTTPException):
    """503 Service Unavailable."""
    
    def __init__(
        self,
        message: str = "Service Unavailable",
        error_code: str = "service_unavailable",
        retry_after: Optional[int] = None,
        **kwargs: Any
    ) -> None:
        headers = {}
        if retry_after is not None:
            headers["Retry-After"] = str(retry_after)
        
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code=error_code,
            message=message,
            headers=headers,
            **kwargs
        )


# Specific application exceptions
class DocumentProcessingError(InternalServerError):
    """Error during document processing."""
    
    def __init__(
        self,
        message: str = "Failed to process document",
        error_code: str = "document_processing_error",
        **kwargs: Any
    ) -> None:
        super().__init__(message=message, error_code=error_code, **kwargs)


class TranslationError(InternalServerError):
    """Error during translation."""
    
    def __init__(
        self,
        message: str = "Failed to translate document",
        error_code: str = "translation_error",
        **kwargs: Any
    ) -> None:
        super().__init__(message=message, error_code=error_code, **kwargs)


class StorageError(InternalServerError):
    """Error during storage operations."""
    
    def __init__(
        self,
        message: str = "Storage operation failed",
        error_code: str = "storage_error",
        **kwargs: Any
    ) -> None:
        super().__init__(message=message, error_code=error_code, **kwargs)


class ValidationError(BadRequestError):
    """Validation error."""
    
    def __init__(
        self,
        message: str = "Validation error",
        error_code: str = "validation_error",
        errors: Optional[Dict[str, Any]] = None,
        **kwargs: Any
    ) -> None:
        super().__init__(
            message=message,
            error_code=error_code,
            errors=errors or {},
            **kwargs
        )
