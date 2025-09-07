"""Pydantic schemas for the API."""
from .base import BaseModel, BaseResponse
from .token import Token, TokenPayload
from .user import (
    UserBase,
    UserCreate,
    UserInDB,
    UserResponse,
    UserUpdate,
    UserUpdatePassword,
)
from .document import (
    DocumentBase,
    DocumentCreate,
    DocumentInDB,
    DocumentProcessRequest,
    DocumentProcessResponse,
    DocumentResponse,
    DocumentStatus,
    DocumentType,
    DocumentUpdate,
)

__all__ = [
    "BaseModel",
    "BaseResponse",
    "Token",
    "TokenPayload",
    "UserBase",
    "UserCreate",
    "UserInDB",
    "UserResponse",
    "UserUpdate",
    "UserUpdatePassword",
    "DocumentBase",
    "DocumentCreate",
    "DocumentInDB",
    "DocumentProcessRequest",
    "DocumentProcessResponse",
    "DocumentResponse",
    "DocumentStatus",
    "DocumentType",
    "DocumentUpdate",
]
