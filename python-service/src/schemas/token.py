"""Token schemas for authentication."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

class Token(BaseModel):
    """Token response schema."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: Optional[int] = Field(
        None, 
        description="Token expiration time in seconds"
    )
    refresh_token: Optional[str] = Field(
        None, 
        description="Refresh token (if supported)"
    )

class TokenPayload(BaseModel):
    """Token payload schema."""
    sub: Optional[str] = Field(
        None, 
        description="Subject (usually user ID or email)"
    )
    exp: Optional[datetime] = Field(
        None, 
        description="Expiration time"
    )
    iat: Optional[datetime] = Field(
        None, 
        description="Issued at time"
    )
    jti: Optional[str] = Field(
        None, 
        description="JWT ID"
    )
    type: Optional[str] = Field(
        None, 
        description="Token type (e.g., 'access', 'refresh')"
    )
    scopes: Optional[list[str]] = Field(
        [], 
        description="List of scopes/roles"
    )

class TokenCreate(BaseModel):
    """Token creation schema."""
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")
    remember_me: bool = Field(
        False, 
        description="Whether to create a long-lived token"
    )

class TokenRefresh(BaseModel):
    """Token refresh schema."""
    refresh_token: str = Field(..., description="Refresh token")
