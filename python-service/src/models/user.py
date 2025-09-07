"""User model and related functionality."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from ..core.security import get_password_hash, verify_password
from ..db.base_class import Base

class UserBase(BaseModel):
    """Base user model with common fields."""
    email: EmailStr
    is_active: bool = True
    is_superuser: bool = False
    full_name: Optional[str] = None
    
    class Config:
        orm_mode = True

class UserCreate(UserBase):
    """Schema for creating a new user with password."""
    password: str

class UserUpdate(BaseModel):
    """Schema for updating user information."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

class UserInDB(UserBase):
    """User model for database operations."""
    id: int
    hashed_password: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class UserResponse(UserBase):
    """User model for API responses."""
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class User(Base):
    """Database model for users."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean(), default=True)
    is_superuser = Column(Boolean(), default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    documents = relationship("Document", back_populates="owner")
    
    def set_password(self, password: str) -> None:
        """Set the user's password."""
        self.hashed_password = get_password_hash(password)
    
    def check_password(self, password: str) -> bool:
        """Check if the provided password matches the stored hash."""
        return verify_password(password, self.hashed_password)
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"
