"""User schemas for the API."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, validator

from ..core.validators import validate_password_strength

class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr = Field(..., description="User's email address (must be unique)")
    full_name: Optional[str] = Field(None, description="User's full name")
    is_active: bool = Field(True, description="Whether the user account is active")
    is_superuser: bool = Field(False, description="Whether the user has admin privileges")

class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str = Field(
        ..., 
        min_length=8, 
        max_length=100, 
        description="User's password (min 8 characters)"
    )
    
    @validator('password')
    def password_strength(cls, v: str) -> str:
        """Validate password strength."""
        return validate_password_strength(v)

class UserUpdate(BaseModel):
    """Schema for updating user information."""
    email: Optional[EmailStr] = Field(None, description="New email address")
    full_name: Optional[str] = Field(None, description="New full name")
    is_active: Optional[bool] = Field(None, description="Whether the user account is active")
    is_superuser: Optional[bool] = Field(None, description="Whether the user has admin privileges")

class UserUpdatePassword(BaseModel):
    """Schema for updating a user's password."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(
        ..., 
        min_length=8, 
        max_length=100, 
        description="New password (min 8 characters)"
    )
    
    @validator('new_password')
    def password_strength(cls, v: str) -> str:
        """Validate password strength."""
        return validate_password_strength(v)

class UserInDB(UserBase):
    """User model for database operations."""
    id: int
    hashed_password: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class UserResponse(UserBase):
    """User model for API responses."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    @classmethod
    def from_orm(cls, user):
        """Convert ORM model to response model."""
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

class UserListResponse(BaseModel):
    """Response model for listing users with pagination."""
    items: list[UserResponse]
    total: int
    page: int
    size: int
    pages: int

class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")
    remember_me: bool = Field(False, description="Whether to create a long-lived session")

class UserForgotPassword(BaseModel):
    """Schema for requesting a password reset."""
    email: EmailStr = Field(..., description="User's email address")

class UserResetPassword(BaseModel):
    """Schema for resetting a user's password."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(
        ..., 
        min_length=8, 
        max_length=100, 
        description="New password (min 8 characters)"
    )
    
    @validator('new_password')
    def password_strength(cls, v: str) -> str:
        """Validate password strength."""
        return validate_password_strength(v)
